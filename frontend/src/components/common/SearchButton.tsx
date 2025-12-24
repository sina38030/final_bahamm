"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FaSearch } from "react-icons/fa";

interface SearchButtonProps {
  placeholder?: string;
  className?: string;
}

const SearchButton: React.FC<SearchButtonProps> = ({
  placeholder = "جستجو در محصولات...",
  className = ""
}) => {
  const router = useRouter();

  const handleClick = () => {
    // Navigate to search page
    router.push("/search");
  };

  return (
    <div
      className={`relative bg-gray-100 rounded-lg p-3 flex items-center cursor-pointer ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <FaSearch className="text-gray-500 ml-2" />
      <div className="text-gray-500">{placeholder}</div>
    </div>
  );
};

export default SearchButton;
