"use client";

import React, { useState, useEffect } from "react";
import { FaSearch, FaTimes, FaArrowRight, FaFire, FaHistory } from "react-icons/fa";
import {
  addToSearchHistory,
  clearSearchHistory,
  getSearchHistory
} from "@/utils/searchHistory";
import { API_BASE_URL } from "@/utils/api";
import ProductCard from "@/components/ProductCard";
import { Product as ProductCardType } from "@/data/products";

interface SearchButtonProps {
  placeholder?: string;
  className?: string;
}

// Define Product type
type Product = {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  image?: string;
  discountPrice?: number | null;
  free_shipping?: boolean;
};

// Popular searches data
const popularSearches = [
  'ماشین اصلاح',
  'هدفون بی سیم',
  'گوشی موبایل',
  'لپ تاپ',
  'لوازم آشپزخانه',
  'لباس مردانه'
];

const SearchButton: React.FC<SearchButtonProps> = ({
  placeholder = "جستجو در محصولات...",
  className = ""
}) => {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Load search history from localStorage on component mount
  useEffect(() => {
    if (isSearchModalOpen) {
      try {
        setSearchHistory(getSearchHistory());
      } catch (err) {
        console.error("Error loading search history:", err);
      }
    }
  }, [isSearchModalOpen]);

  const fetchSearchResults = async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    setShowResults(true);
    
    try {
      const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
      const normalizeImg = (u?: string) => {
        if (!u) return "/images/404.png";
        try {
          if (/^https?:\/\//i.test(u)) return u;
          if (u.startsWith('//')) return window.location.protocol + u;
          if (u.startsWith('/uploads')) return u;
          if (u.startsWith('/static')) return `${apiOrigin}${u}`;
          if (u.startsWith('/')) return `${apiOrigin}${u}`;
          return u;
        } catch {
          return "/images/404.png";
        }
      };

      let res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/products/search?query=${encodeURIComponent(searchQuery)}`);
      }
      
      if (res.ok) {
        const data = await res.json();
        const resultsArray = Array.isArray(data) ? data : (data.results || data.products || []);
        
        const normalized = resultsArray.map((item: any) => ({
          id: item.id,
          name: item.name || item.title || "نام نامشخص",
          description: item.description || "",
          price: item.price || item.base_price || 0,
          image: normalizeImg(item.image || item.imageUrl),
          imageUrl: normalizeImg(item.image || item.imageUrl),
          discountPrice: item.discount_price || item.discountPrice || null,
          free_shipping: item.free_shipping || false,
          ...item
        }));
        
        setProducts(normalized);
      } else {
        setError("خطا در دریافت نتایج جستجو");
        setProducts([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("خطا در ارتباط با سرور");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Real-time search with debounce
  useEffect(() => {
    if (!searchTerm.trim()) {
      setProducts([]);
      setShowResults(false);
      return;
    }

    const debounceTimer = setTimeout(() => {
      fetchSearchResults(searchTerm);
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const openSearchModal = () => {
    setIsSearchModalOpen(true);
  };

  const closeSearchModal = () => {
    setIsSearchModalOpen(false);
    setSearchTerm('');
    setProducts([]);
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setProducts([]);
    setShowResults(false);
  };

  const handleSelectSearch = (term: string) => {
    setSearchTerm(term);
    // Add to search history
    const updatedHistory = addToSearchHistory(term, searchHistory);
    setSearchHistory(updatedHistory);
  };

  const handleClearSearchHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  return (
    <>
      {/* Search Button - Click to Open Modal */}
      <div
        className={`relative bg-gray-100 rounded-lg p-3 flex items-center cursor-pointer ${className}`}
        onClick={openSearchModal}
      >
        <FaSearch className="text-gray-500 ml-2" />
        <div className="text-gray-500">{placeholder}</div>
      </div>

      {/* Full Screen Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Modal Header */}
          <div className="p-4 border-b flex items-center">
            <button
              onClick={closeSearchModal}
              className="ml-3 text-gray-600"
            >
              <FaArrowRight size={20} />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={placeholder}
                className="w-full p-3 pr-10 rounded-lg text-right shadow-sm bg-gray-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
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

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Show search results when user is typing */}
            {showResults ? (
              <div>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-2 text-gray-500">در حال جستجو...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-red-500">{error}</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8">
                    <FaSearch className="mx-auto text-gray-400 text-4xl mb-2" />
                    <p className="text-gray-500">هیچ نتیجه‌ای یافت نشد</p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        {products.length} نتیجه برای "{searchTerm}"
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {products.map((product) => {
                        const productCardData: any = {
                          id: product.id,
                          name: product.name,
                          cat: 'fruit',
                          img: product.image || product.imageUrl || "/images/404.png",
                          weight: product.description || "۱ کیلوگرم",
                          star: "۴٫۵",
                          sales: "۱۰",
                          price: product.price,
                          image: product.image || product.imageUrl || "/images/404.png",
                          imageUrl: product.image || product.imageUrl || "/images/404.png",
                          discountPrice: product.discountPrice || null,
                          free_shipping: product.free_shipping || false,
                        };

                        productCardData.market_price = (product as any).market_price ?? (product as any).solo_price ?? (product as any).discount_price ?? (product as any).base_price ?? product.price ?? 0;
                        productCardData.solo_price = (product as any).solo_price ?? (product as any).market_price ?? (product as any).discount_price ?? (product as any).base_price ?? product.price ?? 0;
                        productCardData.friend_1_price = (product as any).friend_1_price ?? (product as any).base_price ?? product.price ?? 0;
                        productCardData.friend_2_price = (product as any).friend_2_price ?? 0;
                        productCardData.friend_3_price = (product as any).friend_3_price ?? 0;
                        productCardData.weight_tolerance = (product as any).weight_tolerance_grams ?? undefined;
                        productCardData.images = (product as any).images || (product.image ? [product.image] : (product.imageUrl ? [product.imageUrl] : []));

                        return <ProductCard key={product.id} p={productCardData} />;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Popular Searches */}
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <FaFire className="text-red-500 ml-2" />
                    <h3 className="text-sm font-bold">جستجوهای پرطرفدار</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((term, index) => (
                      <button
                        key={index}
                        className="bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 text-sm"
                        onClick={() => handleSelectSearch(term)}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search History */}
                {searchHistory.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <FaHistory className="text-gray-500 ml-2" />
                        <h3 className="text-sm font-bold">تاریخچه جستجو</h3>
                      </div>
                      <button
                        onClick={handleClearSearchHistory}
                        className="text-red-500 text-sm"
                      >
                        پاک کردن تاریخچه
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {searchHistory.map((term, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer"
                          onClick={() => handleSelectSearch(term)}
                        >
                          <div className="flex items-center">
                            <FaHistory className="text-gray-400 ml-2" />
                            <span>{term}</span>
                          </div>
                          <FaArrowRight className="text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SearchButton; 