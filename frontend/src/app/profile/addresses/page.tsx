"use client";

import React, { useState, useEffect } from "react";
import {
  FaMapMarkerAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaMap,
  FaExclamationCircle,
} from "react-icons/fa";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import PrevPage from "@/components/common/PrevPage";
import CustomModal from "@/components/common/CustomModal";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { API_BASE_URL } from "@/utils/api";
import { safeStorage } from "@/utils/safeStorage";

const ModalMap = dynamic(() => import("@/components/common/ModalMap"), {
  ssr: false,
  loading: () => <div className="h-96 w-full bg-gray-100 animate-pulse" />,
});

type Address = {
  id: number;
  title: string;
  full_address: string;
  postal_code: string;
  receiver_name: string;
  phone_number: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
};

const AddressSchema = Yup.object().shape({
  title: Yup.string(),
  full_address: Yup.string()
    .required("آدرس کامل الزامی است")
    .min(10, "آدرس باید حداقل ۱۰ کاراکتر باشد"),
  postal_code: Yup.string()
    .required("کد پستی الزامی است")
    .matches(/^[0-9]{10}$/, "کد پستی باید ۱۰ رقم باشد"),
  receiver_name: Yup.string()
    .required("نام تحویل گیرنده الزامی است")
    .min(3, "نام تحویل گیرنده باید حداقل ۳ کاراکتر باشد"),
  phone_number: Yup.string()
    .required("شماره تماس الزامی است")
    .matches(/^09[0-9]{9}$/, "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد"),
});

export default function AddressesPage() {
  const { token, isAuthenticated, user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  
  // Use user data for default form values if available
  const defaultFormData = {
    title: "",
    full_address: "",
    postal_code: "",
    receiver_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : "",
    phone_number: user?.phone_number || "",
  };
  
  const [formData, setFormData] = useState(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapSelectedAddress, setMapSelectedAddress] = useState("");
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [activeAddressId, setActiveAddressId] = useState<number | null>(null);

  // Use a per-user storage key to avoid cross-user/global browser-only storage
  const storageKey = user?.id ? `addresses_${user.id}` : 'guest_addresses';

  // Fetch addresses from the API or fallback to localStorage
  const fetchAddresses = async () => {
    setIsLoading(true);
    setError(null);
    
    if (isAuthenticated && token) {
      try {
        const response = await fetch(`${API_BASE_URL}/users/addresses`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setAddresses(data);
          // Also update localStorage for offline use (per-user cache)
          safeStorage.setItem(storageKey, JSON.stringify(data));

          // If server has no addresses but legacy localStorage exists (from old implementation), migrate them to server
          if (Array.isArray(data) && data.length === 0 && user?.id) {
            try {
              const migratedFlag = safeStorage.getItem(`addresses_migrated_${user.id}`);
              const legacyRaw = safeStorage.getItem('bahaam-user-addresses');
              if (!migratedFlag && legacyRaw) {
                const legacyList = JSON.parse(legacyRaw);
                if (Array.isArray(legacyList) && legacyList.length > 0) {
                  // POST each legacy address to backend
                  for (const legacy of legacyList) {
                    const payload = {
                      title: legacy.title || 'آدرس',
                      full_address: legacy.full_address || legacy.fullAddress || '',
                      postal_code: legacy.postal_code || legacy.postalCode || '0000000000',
                      receiver_name: legacy.receiver_name || legacy.receiverName || '',
                      phone_number: legacy.phone_number || legacy.phone || '',
                      latitude: legacy.latitude ?? null,
                      longitude: legacy.longitude ?? null,
                      is_default: !!legacy.is_default,
                    };
                    try {
                      const res = await fetch(`${API_BASE_URL}/users/addresses`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(payload),
                      });
                      // Ignore individual failures and continue
                    } catch {}
                  }
                  // Mark migrated and refresh from server
                  safeStorage.setItem(`addresses_migrated_${user.id}`, '1');
                  try {
                    const re = await fetch(`${API_BASE_URL}/users/addresses`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (re.ok) {
                      const migrated = await re.json();
                      setAddresses(migrated);
                      safeStorage.setItem(storageKey, JSON.stringify(migrated));
                    }
                  } catch {}
                }
              }
            } catch {}
          }
          
          // Set the active address if there's a default one
          const defaultAddress = data.find((addr: Address) => addr.is_default);
          if (defaultAddress) {
            setActiveAddressId(defaultAddress.id);
          }
        } else {
          // If API call fails, fallback to localStorage (per-user)
          loadAddressesFromLocalStorage();
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
        setError("خطا در دریافت آدرس‌ها. لطفاً دوباره تلاش کنید");
        // Fallback to localStorage
        loadAddressesFromLocalStorage();
      } finally {
        setIsLoading(false);
      }
    } else {
      // Not authenticated, use localStorage (guest scope)
      loadAddressesFromLocalStorage();
      setIsLoading(false);
    }
  };

  // Load addresses from localStorage
  const loadAddressesFromLocalStorage = () => {
    try {
      const savedAddresses = safeStorage.getItem(storageKey);
      if (savedAddresses) {
        const parsedAddresses = JSON.parse(savedAddresses);
        if (Array.isArray(parsedAddresses) && parsedAddresses.length > 0) {
          setAddresses(parsedAddresses);
          
          // Set the active address if there's a default one
          const defaultAddress = parsedAddresses.find((addr: Address) => addr.is_default);
          if (defaultAddress) {
            setActiveAddressId(defaultAddress.id);
          }
        }
      }
    } catch (error) {
      console.error("Error loading addresses from localStorage:", error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAddresses();
  }, [isAuthenticated, token]);

  // Save a new address or update an existing one
  const saveAddress = async (addressData: Address) => {
    if (isAuthenticated && token) {
      try {
        const url = editingAddressId 
          ? `${API_BASE_URL}/users/addresses/${editingAddressId}` 
          : `${API_BASE_URL}/users/addresses`;
        
        const method = editingAddressId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(addressData),
        });
        
        if (response.ok) {
          const savedAddress = await response.json();
          
          if (editingAddressId) {
            // Update the existing address
            setAddresses(prev => 
              prev.map(addr => addr.id === editingAddressId ? savedAddress : addr)
            );
          } else {
            // Add the new address
            setAddresses(prev => [...prev, savedAddress]);
          }
          
          // Update localStorage (per-user cache)
          safeStorage.setItem(
            storageKey,
            JSON.stringify(editingAddressId 
              ? addresses.map(addr => addr.id === editingAddressId ? savedAddress : addr)
              : [...addresses, savedAddress]
            )
          );
          
          return true;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'خطا در ذخیره آدرس');
        }
      } catch (error) {
        console.error("Error saving address:", error);
        setError(error instanceof Error ? error.message : 'خطا در ذخیره آدرس');
        return false;
      }
    } else {
      // Fallback to localStorage for non-authenticated users
      return true;
    }
  };

  // Delete an address
  const deleteAddress = async (id: number) => {
    if (isAuthenticated && token) {
      try {
        const response = await fetch(`${API_BASE_URL}/users/addresses/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          setAddresses(prev => prev.filter(addr => addr.id !== id));
          
          // Update localStorage (per-user cache)
          safeStorage.setItem(
            storageKey,
            JSON.stringify(addresses.filter(addr => addr.id !== id))
          );
          
          if (activeAddressId === id) {
            setActiveAddressId(null);
          }
          
          return true;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'خطا در حذف آدرس');
        }
      } catch (error) {
        console.error("Error deleting address:", error);
        setError(error instanceof Error ? error.message : 'خطا در حذف آدرس');
        return false;
      }
    } else {
      // Fallback to localStorage for non-authenticated users
      setAddresses(prev => prev.filter(address => address.id !== id));
      if (activeAddressId === id) setActiveAddressId(null);
      
      // Update localStorage
      safeStorage.setItem(
        storageKey,
        JSON.stringify(addresses.filter(address => address.id !== id))
      );
      
      return true;
    }
  };

  // Set an address as default
  const setDefaultAddress = async (id: number) => {
    if (isAuthenticated && token) {
      try {
        const response = await fetch(`${API_BASE_URL}/users/addresses/${id}/default`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          // Update addresses to reflect the new default
          setAddresses(prev => 
            prev.map(addr => ({
              ...addr,
              is_default: addr.id === id
            }))
          );
          
          // Update localStorage (per-user cache)
          safeStorage.setItem(
            storageKey,
            JSON.stringify(addresses.map(addr => ({
              ...addr,
              is_default: addr.id === id
            })))
          );
          
          setActiveAddressId(id);
          return true;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'خطا در تنظیم آدرس پیش فرض');
        }
      } catch (error) {
        console.error("Error setting default address:", error);
        setError(error instanceof Error ? error.message : 'خطا در تنظیم آدرس پیش فرض');
        return false;
      }
    } else {
      // Fallback to localStorage for non-authenticated users
      setAddresses(prev => 
        prev.map(addr => ({
          ...addr,
          is_default: addr.id === id
        }))
      );
      
      // Update localStorage
      safeStorage.setItem(
        storageKey,
        JSON.stringify(addresses.map(addr => ({
          ...addr,
          is_default: addr.id === id
        })))
      );
      
      setActiveAddressId(id);
      return true;
    }
  };

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const newAddress: Address = {
        id: editingAddressId !== null ? editingAddressId : Date.now(),
        ...values,
        ...(selectedLocation && { 
          latitude: selectedLocation.lat, 
          longitude: selectedLocation.lng 
        }),
      };
      
      // Try to save to API first
      const success = await saveAddress(newAddress);
      
      if (success) {
        // If API call successful (or if using localStorage), update the local state
        if (!isAuthenticated || !token) {
          setAddresses((prev) =>
            editingAddressId !== null
              ? prev.map((address) =>
                  address.id === editingAddressId ? newAddress : address
                )
              : [...prev, newAddress]
          );
        }
        
        setIsModalOpen(false);
        setFormData(defaultFormData);
        setSelectedLocation(null);
        setMapSelectedAddress("");
        setEditingAddressId(null);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setError("خطا در ذخیره آدرس. لطفاً دوباره تلاش کنید");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    
    // Set coordinates as the selected address
    const selectedAddress = `موقعیت انتخاب شده: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    setMapSelectedAddress(selectedAddress);
    setFormData(prev => ({
      ...prev,
      full_address: selectedAddress
    }));
    // After picking a location, close the map and ensure the edit modal is open for saving
    setIsMapModalOpen(false);
    setIsModalOpen(true);
  };

  const openMapModal = () => {
    setIsMapModalOpen(true);
  };

  const handleEdit = (address: Address) => {
    setFormData({
      title: address.title,
      full_address: address.full_address,
      postal_code: address.postal_code,
      // Use address values if present, otherwise use default values from user profile
      receiver_name: address.receiver_name || (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : ""),
      phone_number: address.phone_number || user?.phone_number || "",
    });
    if (address.latitude && address.longitude) {
      setSelectedLocation({ lat: address.latitude, lng: address.longitude });
    }
    setEditingAddressId(address.id);
    // If only one address exists, open the map directly for quick location edit
    if (addresses.length === 1) {
      setIsMapModalOpen(true);
      return;
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("آیا از حذف این آدرس مطمئن هستید؟")) {
      deleteAddress(id);
    }
  };

  const handleSelectAddress = (id: number) => {
    setActiveAddressId(id);
    setDefaultAddress(id);
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-48 h-48 relative mb-6 text-gray-300">
        <FaMapMarkerAlt size={120} className="mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        شما هنوز آدرسی ثبت نکرده‌اید
      </h3>
      <p className="text-gray-500 text-center mb-6">
        برای ثبت سفارش نیاز به حداقل یک آدرس دارید
      </p>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-primary text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
      >
        <FaPlus size={16} />
        افزودن آدرس جدید
      </button>
    </div>
  );

  const AddressCard = ({ address }: { address: Address }) => (
    <div
      className={`border rounded-lg p-4 transition-all ${
        address.id === activeAddressId
          ? "border-primary shadow-md"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <FaMapMarkerAlt className="text-primary mr-2" />
          <h3 className="font-medium">{address.title || "آدرس"}</h3>
        </div>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <button
            onClick={() => handleEdit(address)}
            className="text-gray-600 hover:text-primary transition-colors"
            aria-label="ویرایش آدرس"
          >
            <FaEdit size={18} />
          </button>
          <button
            onClick={() => handleDelete(address.id)}
            className="text-gray-600 hover:text-red-500 transition-colors"
            aria-label="حذف آدرس"
          >
            <FaTrash size={18} />
          </button>
        </div>
      </div>

      <p className="text-gray-700 mb-2 leading-relaxed text-sm">
        {address.full_address}
      </p>

      <div className="text-gray-600 text-sm mb-3">
        <p>کد پستی: {address.postal_code}</p>
        <p>
          گیرنده: {address.receiver_name} | {address.phone_number}
        </p>
      </div>

      <div className="flex justify-between items-center mt-2">
        {address.id === activeAddressId ? (
          <span className="text-primary text-sm flex items-center">
            <span className="bg-primary w-2 h-2 rounded-full inline-block ml-1"></span>
            آدرس پیش‌فرض
          </span>
        ) : (
          <button
            onClick={() => handleSelectAddress(address.id)}
            className="text-primary text-sm hover:underline"
          >
            انتخاب به عنوان پیش‌فرض
          </button>
        )}

        {(address.latitude && address.longitude) && (
          <button
            onClick={() => {
              // Show on map functionality would go here
            }}
            className="text-gray-600 hover:text-primary text-sm flex items-center transition-colors"
          >
            <FaMap className="ml-1" size={14} />
            نمایش روی نقشه
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen mx-auto pb-16">
      <PrevPage title="آدرس‌های من" />
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 my-2">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="md" className="mb-2" />
            <p className="mr-2">در حال بارگذاری آدرس‌ها...</p>
          </div>
        ) : addresses.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => {
                setFormData(defaultFormData);
                setEditingAddressId(null);
                setIsModalOpen(true);
              }}
              className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors mb-4"
            >
              <FaPlus size={16} />
              افزودن آدرس جدید
            </button>
            {addresses.map((address) => (
              <AddressCard key={address.id} address={address} />
            ))}
          </div>
        )}
      </div>

      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddressId !== null ? "ویرایش آدرس" : "افزودن آدرس جدید"}
        submitLabel="ثبت آدرس"
        hideFooter={true}
      >
        <div>
          <Formik
            initialValues={{
              title: formData.title,
              full_address: formData.full_address,
              postal_code: formData.postal_code,
              receiver_name: formData.receiver_name,
              phone_number: formData.phone_number,
            }}
            validationSchema={AddressSchema}
            onSubmit={handleSubmit}
            enableReinitialize={true}
          >
            {({
              isSubmitting,
              errors,
              touched,
              handleSubmit,
              setTouched,
              validateForm,
            }) => (
              <Form className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    عنوان آدرس
                  </label>
                  <Field
                    type="text"
                    name="title"
                    placeholder="مثال: خانه، محل کار"
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    آدرس کامل <span className="text-red-500">*</span>
                  </label>
                  <Field
                    as="textarea"
                    rows={3}
                    name="full_address"
                    className={`w-full p-2 border rounded-lg ${
                      touched.full_address && errors.full_address
                        ? "border-red-500"
                        : selectedLocation ? "border-green-500" : "border-gray-300"
                    }`}
                  />
                  {touched.full_address && errors.full_address && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.full_address}
                    </p>
                  )}
                  
                  {selectedLocation && (
                    <div className="mt-1 text-xs text-green-600 flex items-center">
                      <FaMapMarkerAlt className="mr-1" size={12} />
                      موقعیت روی نقشه انتخاب شده است
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={openMapModal}
                    className="mt-2 px-3 py-2 bg-blue-50 text-primary rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm"
                  >
                    <FaMap size={14} />
                    انتخاب موقعیت از روی نقشه
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      کد پستی <span className="text-red-500">*</span>
                    </label>
                    <Field
                      type="text"
                      name="postal_code"
                      className={`w-full p-2 border rounded-lg ${
                        touched.postal_code && errors.postal_code
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {touched.postal_code && errors.postal_code && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.postal_code}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نام گیرنده <span className="text-red-500">*</span>
                    </label>
                    <Field
                      type="text"
                      name="receiver_name"
                      className={`w-full p-2 border rounded-lg ${
                        touched.receiver_name && errors.receiver_name
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {touched.receiver_name && errors.receiver_name && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.receiver_name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    شماره موبایل <span className="text-red-500">*</span>
                  </label>
                  <Field
                    type="text"
                    name="phone_number"
                    className={`w-full p-2 border rounded-lg ${
                      touched.phone_number && errors.phone_number
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {touched.phone_number && errors.phone_number && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.phone_number}
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    disabled={isSubmitting}
                    onClick={() => {
                      // Mark all required fields as touched to show validation errors
                      setTouched({
                        full_address: true,
                        postal_code: true,
                        receiver_name: true,
                        phone_number: true
                      });
                      // Only submit if form is valid
                      validateForm().then((errors) => {
                        if (Object.keys(errors).length === 0) {
                          handleSubmit();
                        }
                      });
                    }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <LoadingSpinner size="sm" className="mr-2" />
                        در حال ثبت...
                      </span>
                    ) : (
                      "ثبت آدرس"
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </CustomModal>

      <CustomModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title="انتخاب موقعیت از روی نقشه"
        hideFooter
      >
        <div className="h-[500px]">
          <ModalMap 
            onLocationSelect={handleLocationSelect} 
            isOpen={isMapModalOpen}
          />
        </div>
      </CustomModal>
      
      
    </div>
  );
}