"use client";

import React, { useState, useEffect } from "react";
import { FaSearch, FaTimes, FaArrowLeft, FaFire, FaHistory } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { 
  addToSearchHistory, 
  clearSearchHistory, 
  getSearchHistory 
} from "@/utils/searchHistory";

interface SearchButtonProps {
  placeholder?: string;
  className?: string;
}

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
  const router = useRouter();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load search history from localStorage on component mount
  useEffect(() => {
    if (isSearchModalOpen) {
      setSearchHistory(getSearchHistory());
    }
  }, [isSearchModalOpen]);

  const openSearchModal = () => {
    setIsSearchModalOpen(true);
  };

  const closeSearchModal = () => {
    setIsSearchModalOpen(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleSearch = (term: string = searchTerm) => {
    if (term.trim()) {
      // Add to search history and update state
      const updatedHistory = addToSearchHistory(term, searchHistory);
      setSearchHistory(updatedHistory);

      // Close the modal and navigate to search results page
      setIsSearchModalOpen(false);
      router.push(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
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
              <FaArrowLeft size={20} />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={placeholder}
                className="w-full p-3 pr-10 rounded-lg text-right shadow-sm bg-gray-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
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
            {searchTerm && (
              <button
                onClick={() => handleSearch()}
                className="mr-3 bg-primary text-white px-4 py-2 rounded-lg"
              >
                جستجو
              </button>
            )}
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-4">
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
                    onClick={() => {
                      setSearchTerm(term);
                      handleSearch(term);
                    }}
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
                      onClick={() => {
                        setSearchTerm(term);
                        handleSearch(term);
                      }}
                    >
                      <div className="flex items-center">
                        <FaHistory className="text-gray-400 ml-2" />
                        <span>{term}</span>
                      </div>
                      <FaArrowLeft className="text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SearchButton; 