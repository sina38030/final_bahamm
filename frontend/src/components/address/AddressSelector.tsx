'use client';

import { useState, useEffect } from 'react';
import AddressMapModal from '@/components/map/AddressMapModal';
import { useAuth } from '@/contexts/AuthContext';

interface AddressSelectorProps {
  onAddressSelect?: (address: any) => void;
  className?: string;
}

export default function AddressSelector({ onAddressSelect, className = '' }: AddressSelectorProps) {
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [userAddresses, setUserAddresses] = useState<any[]>([]);
  const { token, user, isAuthenticated } = useAuth();

  // Load user addresses
  useEffect(() => {
    const loadAddresses = async () => {
      if (isAuthenticated && token) {
        try {
          const response = await fetch('http://localhost:8001/api/users/addresses', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const addresses = await response.json();
            setUserAddresses(addresses);
            
            // Auto-select default address
            const defaultAddress = addresses.find((addr: any) => addr.is_default);
            if (defaultAddress) {
              setSelectedAddress(defaultAddress);
              onAddressSelect?.(defaultAddress);
            }
          }
        } catch (error) {
          console.error('Error loading addresses:', error);
        }
      }
    };
    
    loadAddresses();
  }, [isAuthenticated, token]);

  const handleAddressSave = async () => {
    // Reload addresses after saving
    if (isAuthenticated && token) {
      try {
        const response = await fetch('http://localhost:8001/api/users/addresses', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const addresses = await response.json();
          setUserAddresses(addresses);
          
          // Select the newest address (last one added)
          const newestAddress = addresses[addresses.length - 1];
          if (newestAddress) {
            setSelectedAddress(newestAddress);
            onAddressSelect?.(newestAddress);
          }
        }
      } catch (error) {
        console.error('Error reloading addresses:', error);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`border border-gray-300 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <p>برای انتخاب آدرس، ابتدا وارد حساب کاربری خود شوید</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`border border-gray-300 rounded-lg p-4 ${className}`}>
        {selectedAddress ? (
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">آدرس تحویل:</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {selectedAddress.full_address}
                </p>
                {selectedAddress.details && (
                  <p className="text-gray-600 text-sm mt-1">
                    {selectedAddress.details}
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  تلفن: {selectedAddress.phone_number}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowMapModal(true)}
                  className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                >
                  ویرایش
                </button>
                {userAddresses.length > 1 && (
                  <select
                    value={selectedAddress.id}
                    onChange={(e) => {
                      const addr = userAddresses.find(a => a.id === parseInt(e.target.value));
                      if (addr) {
                        setSelectedAddress(addr);
                        onAddressSelect?.(addr);
                      }
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    {userAddresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.title || `آدرس ${addr.id}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={() => setShowMapModal(true)}
              className="text-blue-500 hover:text-blue-700 font-medium"
            >
              + افزودن آدرس
            </button>
          </div>
        )}
      </div>

      {/* Address Map Modal */}
      <AddressMapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        onAddressSave={handleAddressSave}
        userToken={token || undefined}
        userId={user?.id}
      />
    </>
  );
}