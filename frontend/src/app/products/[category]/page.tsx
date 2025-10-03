"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FaSearch,
  FaTimes,
  FaHeart,
  FaArrowLeft,
  FaCheck,
  FaFilter,
} from "react-icons/fa";
import { useParams } from "next/navigation";
import CustomModal from "@/components/common/CustomModal";
import { BsFilter } from "react-icons/bs";
import { API_BASE_URL } from "@/utils/api";

// Define types for our data structures
type Product = {
  id: number;
  name: string;
  image: string; // Main image
  price: number;
  discount_price?: number | null;
  discount?: number | null;
  free_shipping?: boolean;
  category?: string;
  category_slug?: string | null;
  subcategory?: string | null;
  subcategory_slug?: string | null;
  in_stock?: boolean;
};

// Define filter types
type FilterType =
  | "color"
  | "price"
  | "popular"
  | "bestselling"
  | "freeShipping";

// Define active filters state type
type ActiveFilters = {
  color: boolean;
  price: boolean;
  popular: boolean;
  bestselling: boolean;
  freeShipping: boolean;
};

export default function ProductCategoryPage() {
  // Use the useParams hook instead of receiving params as props
  const params = useParams();
  const categorySlug = params.category as string;

  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState<string>("محصولات");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  // Active filters state
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    color: false,
    price: false,
    popular: false,
    bestselling: false,
    freeShipping: false,
  });

  // Filter states
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: 1000000,
  });
  const [sortBy, setSortBy] = useState<string>("");
  const [onlyFreeShipping, setOnlyFreeShipping] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First try to fetch products for subcategory
        let response = await fetch(`${API_BASE_URL}/products/subcategory/${categorySlug}`);
        let isCategory = false;
        
        // If subcategory not found, try as category
        if (!response.ok && response.status === 404) {
          response = await fetch(`${API_BASE_URL}/products/category/${categorySlug}`);
          isCategory = true;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }
        
        const data = await response.json();
        
        // If we found products, also get the category or subcategory name
        if (data && data.length > 0) {
          // Get category name from the first product
          if (isCategory) {
            setCategoryName(data[0].category || "محصولات");
          } else {
            setCategoryName(data[0].subcategory || "محصولات");
          }
          
          // Process data to match our Product type
          const processedProducts = data.map((product: any) => ({
            id: product.id,
            name: product.name,
            image: product.image || "",
            price: product.price,
            discount_price: product.discount_price,
            discount: product.discount,
            free_shipping: product.free_shipping,
            category: product.category,
            category_slug: product.category_slug,
            subcategory: product.subcategory,
            subcategory_slug: product.subcategory_slug,
            in_stock: product.in_stock
          }));
          
          setProducts(processedProducts);
          setFilteredProducts(processedProducts);
          setOriginalProducts(processedProducts);
          
          // Set price range based on actual products
          if (processedProducts.length > 0) {
            let minPrice = Number.MAX_SAFE_INTEGER;
            let maxPrice = 0;
            
            processedProducts.forEach((product) => {
              const price = product.discount_price || product.price;
              if (price < minPrice) minPrice = price;
              if (price > maxPrice) maxPrice = price;
            });
            
            // Add some margin to the price range
            minPrice = Math.max(0, minPrice - 50000);
            maxPrice = maxPrice + 50000;
            
            setPriceRange({ min: minPrice, max: maxPrice });
          }
        } else {
          setProducts([]);
          setFilteredProducts([]);
          setOriginalProducts([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("خطا در دریافت محصولات. لطفا دوباره تلاش کنید.");
        setLoading(false);
      }
    };
    
    if (categorySlug) {
      fetchProducts();
    }
  }, [categorySlug]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim() === "") {
      // If no search term, show filtered products or original products
      applyAllActiveFilters();
    } else {
      // Apply search on current filtered products
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
    applyAllActiveFilters();
  };

  // Format price in Persian
  const formatPrice = (price: number) => {
    return price.toLocaleString("fa-IR");
  };

  // Helper function to check if a product has free shipping
  const hasFreeShipping = (product: Product) => {
    return product.free_shipping === true;
  };

  // Open filter modal
  const openFilterModal = (filterType: FilterType) => {
    setActiveFilter(filterType);
    setIsFilterModalOpen(true);
  };

  // Close filter modal
  const closeFilterModal = () => {
    setIsFilterModalOpen(false);
    setActiveFilter(null);
  };

  // Apply all active filters
  const applyAllActiveFilters = () => {
    let filtered = [...originalProducts];

    // Apply price filter
    if (activeFilters.price) {
      filtered = filtered.filter((product) => {
        const productPrice = product.discount_price || product.price;
        return productPrice >= priceRange.min && productPrice <= priceRange.max;
      });
    }

    // Apply sorting
    if (activeFilters.popular || activeFilters.bestselling) {
      if (sortBy === "popular") {
        filtered = [...filtered].sort((a, b) => b.id - a.id);
      } else if (sortBy === "bestselling") {
        filtered = [...filtered].sort((a, b) => a.id - b.id);
      } else if (sortBy === "priceAsc") {
        filtered = [...filtered].sort((a, b) => {
          const priceA = a.discount_price || a.price;
          const priceB = b.discount_price || b.price;
          return priceA - priceB;
        });
      } else if (sortBy === "priceDesc") {
        filtered = [...filtered].sort((a, b) => {
          const priceA = a.discount_price || a.price;
          const priceB = b.discount_price || b.price;
          return priceB - priceA;
        });
      }
    }

    // Apply free shipping filter
    if (activeFilters.freeShipping) {
      filtered = filtered.filter((product) => hasFreeShipping(product));
    }

    // Apply color filter (placeholder)
    if (activeFilters.color && selectedColors.length > 0) {
      // This is just a placeholder - in a real app, products would have color attributes
      filtered = filtered.filter((product) => product.id % 2 === 0);
    }

    setProducts(filtered);

    // Apply search term if it exists
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  // Apply filters
  const applyFilters = () => {
    // Update active filters based on current filter
    if (activeFilter) {
      const newActiveFilters = { ...activeFilters };

      switch (activeFilter) {
        case "color":
          newActiveFilters.color = selectedColors.length > 0;
          break;
        case "price":
          // فعال کردن فیلتر قیمت حتی اگر محدوده قیمت تغییر نکرده باشد
          newActiveFilters.price = true;
          break;
        case "popular":
        case "bestselling":
          newActiveFilters.popular =
            sortBy === "popular" ||
            sortBy === "priceAsc" ||
            sortBy === "priceDesc";
          newActiveFilters.bestselling = sortBy === "bestselling";
          break;
        case "freeShipping":
          newActiveFilters.freeShipping = onlyFreeShipping;
          break;
      }

      setActiveFilters(newActiveFilters);
    }

    // Apply all active filters
    applyAllActiveFilters();
    closeFilterModal();
  };

  // Clear a specific filter
  const clearFilter = (filterType: FilterType) => {
    const newActiveFilters = { ...activeFilters };

    switch (filterType) {
      case "color":
        setSelectedColors([]);
        newActiveFilters.color = false;
        break;
      case "price":
        setPriceRange({ min: 0, max: 1000000 });
        newActiveFilters.price = false;
        break;
      case "popular":
      case "bestselling":
        setSortBy("");
        newActiveFilters.popular = false;
        newActiveFilters.bestselling = false;
        break;
      case "freeShipping":
        setOnlyFreeShipping(false);
        newActiveFilters.freeShipping = false;
        break;
    }

    setActiveFilters(newActiveFilters);
    applyAllActiveFilters();
  };

  // Render filter modal content based on active filter
  const renderFilterModalContent = () => {
    switch (activeFilter) {
      case "color":
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-2">انتخاب رنگ:</p>
            <div className="flex flex-wrap gap-2">
              {["قرمز", "آبی", "سبز", "زرد", "سیاه", "سفید"].map((color) => (
                <div
                  key={color}
                  className={`px-3 py-2 rounded-full cursor-pointer ${
                    selectedColors.includes(color)
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                  onClick={() => {
                    if (selectedColors.includes(color)) {
                      setSelectedColors(
                        selectedColors.filter((c) => c !== color)
                      );
                    } else {
                      setSelectedColors([...selectedColors, color]);
                    }
                  }}
                >
                  {color}
                </div>
              ))}
            </div>
          </div>
        );
      case "price":
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-2">محدوده قیمت:</p>

            {/* حداقل قیمت */}
            <div className="flex items-center gap-2">
              <span className="text-sm">از:</span>
              <input
                type="number"
                min={0}
                max={priceRange.max}
                value={priceRange.min}
                onChange={(e) => {
                  const newMin = parseInt(e.target.value);
                  if (
                    !isNaN(newMin) &&
                    newMin >= 0 &&
                    newMin <= priceRange.max
                  ) {
                    setPriceRange({ ...priceRange, min: newMin });
                  }
                }}
                className="w-full p-2 border rounded-md text-left"
              />
              <span className="text-sm">تومان</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={priceRange.max}
                step={Math.max(10000, Math.floor(priceRange.max / 20))}
                value={priceRange.min}
                onChange={(e) => {
                  const newMin = parseInt(e.target.value);
                  // اطمینان از اینکه حداقل قیمت از حداکثر بیشتر نشود
                  if (newMin <= priceRange.max) {
                    setPriceRange({ ...priceRange, min: newMin });
                  }
                }}
                className="w-full"
              />
            </div>

            {/* حداکثر قیمت */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm">تا:</span>
              <input
                type="number"
                min={priceRange.min}
                value={priceRange.max}
                onChange={(e) => {
                  const newMax = parseInt(e.target.value);
                  if (!isNaN(newMax) && newMax >= priceRange.min) {
                    setPriceRange({ ...priceRange, max: newMax });
                  }
                }}
                className="w-full p-2 border rounded-md text-left"
              />
              <span className="text-sm">تومان</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="range"
                min={priceRange.min}
                max={priceRange.max * 1.2}
                step={Math.max(10000, Math.floor(priceRange.max / 20))}
                value={priceRange.max}
                onChange={(e) => {
                  const newMax = parseInt(e.target.value);
                  // اطمینان از اینکه حداکثر قیمت از حداقل کمتر نشود
                  if (newMax >= priceRange.min) {
                    setPriceRange({ ...priceRange, max: newMax });
                  }
                }}
                className="w-full"
              />
            </div>
          </div>
        );
      case "popular":
      case "bestselling":
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-2">مرتب‌سازی بر اساس:</p>
            <div className="space-y-2">
              {[
                { id: "popular", label: "محبوب‌ترین" },
                { id: "bestselling", label: "پرفروش‌ترین" },
                { id: "priceAsc", label: "قیمت (کم به زیاد)" },
                { id: "priceDesc", label: "قیمت (زیاد به کم)" },
                { id: "newest", label: "جدیدترین" },
              ].map((option) => (
                <div key={option.id} className="flex items-center">
                  <input
                    type="radio"
                    id={option.id}
                    name="sortBy"
                    value={option.id}
                    checked={sortBy === option.id}
                    onChange={() => setSortBy(option.id)}
                    className="ml-2"
                  />
                  <label htmlFor={option.id} className="text-sm">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      case "freeShipping":
        return (
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="freeShipping"
                checked={onlyFreeShipping}
                onChange={() => setOnlyFreeShipping(!onlyFreeShipping)}
                className="ml-2"
              />
              <label htmlFor="freeShipping" className="text-sm">
                فقط کالاهای با ارسال رایگان
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2 pr-5">
              محصولاتی که با علامت ارسال رایگان مشخص شده‌اند
            </p>
          </div>
        );
      default:
        return <p>لطفاً یک فیلتر انتخاب کنید</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Back Button and Title */}
      <div className="bg-white p-4 flex items-center sticky top-0 z-10 shadow-sm">
        <Link href="/categories" className="ml-3">
          <FaArrowLeft className="text-gray-600" />
        </Link>
        <h1 className="text-lg font-bold">{categoryName}</h1>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-gray-200 sticky top-12 z-10">
        <div className="relative">
          <input
            type="text"
            placeholder="جستجو در محصولات..."
            className="w-full p-3 pr-10 rounded-lg text-right shadow-sm"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            {searchTerm ? (
              <FaTimes className="cursor-pointer" onClick={clearSearch} />
            ) : (
              <FaSearch />
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto p-2 bg-white shadow-sm">
        <button
          className="ml-auto p-2 text-gray-600 hover:text-primary"
          onClick={() => setIsFilterModalOpen(true)} // Open filter modal on click
        >
          <FaFilter size={20} />
        </button>
        <div
          className={`flex-shrink-0 px-3 py-2 rounded-full mx-1 text-sm cursor-pointer relative flex items-center ${
            activeFilters.color
              ? "bg-primary text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          onClick={() => openFilterModal("color")}
        >
          <span>رنگ</span>
          {activeFilters.color && (
            <button
              className="mr-1 bg-white rounded-full w-4 h-4 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                clearFilter("color");
              }}
            >
              <FaTimes size={8} className="text-primary" />
            </button>
          )}
        </div>
        <div
          className={`flex-shrink-0 px-3 py-2 rounded-full mx-1 text-sm cursor-pointer relative flex items-center ${
            activeFilters.price
              ? "bg-primary text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          onClick={() => openFilterModal("price")}
        >
          <span>قیمت</span>
          {activeFilters.price && (
            <button
              className="mr-1 bg-white rounded-full w-4 h-4 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                clearFilter("price");
              }}
            >
              <FaTimes size={8} className="text-primary" />
            </button>
          )}
        </div>
        <div
          className={`flex-shrink-0 px-3 py-2 rounded-full mx-1 text-sm cursor-pointer relative flex items-center ${
            activeFilters.popular
              ? "bg-primary text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          onClick={() => openFilterModal("popular")}
        >
          <span>محبوب‌ترین</span>
          {activeFilters.popular && (
            <button
              className="mr-1 bg-white rounded-full w-4 h-4 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                clearFilter("popular");
              }}
            >
              <FaTimes size={8} className="text-primary" />
            </button>
          )}
        </div>
        <div
          className={`flex-shrink-0 px-3 py-2 rounded-full mx-1 text-sm cursor-pointer relative flex items-center ${
            activeFilters.bestselling
              ? "bg-primary text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          onClick={() => openFilterModal("bestselling")}
        >
          <span>پرفروش‌ترین</span>
          {activeFilters.bestselling && (
            <button
              className="mr-1 bg-white rounded-full w-4 h-4 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                clearFilter("bestselling");
              }}
            >
              <FaTimes size={8} className="text-primary" />
            </button>
          )}
        </div>
        <div
          className={`flex-shrink-0 px-3 py-2 rounded-full mx-1 text-sm cursor-pointer relative flex items-center ${
            activeFilters.freeShipping
              ? "bg-primary text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          onClick={() => openFilterModal("freeShipping")}
        >
          <span>ارسال رایگان</span>
          {activeFilters.freeShipping && (
            <button
              className="mr-1 bg-white rounded-full w-4 h-4 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                clearFilter("freeShipping");
              }}
            >
              <FaTimes size={8} className="text-primary" />
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {Object.values(activeFilters).some(Boolean) && (
        <div className="bg-white p-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              فیلترهای فعال: {filteredProducts.length} محصول
            </div>
            <button
              className="text-primary text-sm"
              onClick={() => {
                setActiveFilters({
                  color: false,
                  price: false,
                  popular: false,
                  bestselling: false,
                  freeShipping: false,
                });
                setSelectedColors([]);
                setPriceRange({ min: 0, max: 1000000 });
                setSortBy("");
                setOnlyFreeShipping(false);
                setProducts(originalProducts);
                setFilteredProducts(originalProducts);
              }}
            >
              پاک کردن همه
            </button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">در حال بارگذاری محصولات...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <button 
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
              onClick={() => window.location.reload()}
            >
              تلاش مجدد
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <Link
                href={`/product/${product.id}`}
                key={product.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="relative">
                  <div className="aspect-square p-2 flex items-center justify-center">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-500">تصویر</span>
                      </div>
                    )}
                  </div>
                  <button 
                    className="absolute top-4 left-4 text-gray-400 hover:text-red-500"
                    onClick={(e) => {
                      e.preventDefault();
                      // Add to favorites logic
                    }}
                  >
                    <FaHeart size={18} />
                  </button>
                  {/* Add free shipping label at top right */}
                  {hasFreeShipping(product) && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-2 py-1 rounded-md flex items-center">
                      <FaCheck className="ml-1" size={10} />
                      <span>ارسال رایگان</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-right mb-2">
                    {product.name}
                  </h3>
                  <div className="flex flex-col items-end">
                    {/* اطلاعات قیمت‌گذاری گروهی */}
                    <div className="w-full">
                      <div className="bg-blue-50 p-2 rounded-md text-xs text-right space-y-2">
                        <div className="flex items-center justify-between ">
                          <span className="text-blue-600 font-medium">
                            گروه ۲ نفره:
                          </span>
                          <span className="text-blue-800 font-bold">
                            {formatPrice(
                              product.discount_price || Math.floor(product.price * 0.9)
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-green-600 font-medium">
                            تکی:
                          </span>
                          <span className="text-green-800 font-bold">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">محصولی یافت نشد</p>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <CustomModal
        isOpen={isFilterModalOpen}
        onClose={closeFilterModal}
        title={
          activeFilter === "color"
            ? "انتخاب رنگ"
            : activeFilter === "price"
            ? "محدوده قیمت"
            : activeFilter === "popular"
            ? "مرتب‌سازی بر اساس محبوبیت"
            : activeFilter === "bestselling"
            ? "مرتب‌سازی بر اساس پرفروش‌ترین"
            : activeFilter === "freeShipping"
            ? "ارسال رایگان"
            : "فیلتر محصولات"
        }
        submitLabel="اعمال فیلتر"
        onSubmit={applyFilters}
        size="lg"
      >
        {renderFilterModalContent()}
      </CustomModal>
    </div>
  );
}
