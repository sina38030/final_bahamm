"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PrevPage from "@/components/common/PrevPage";
import ProductCard from "@/components/product/ProductCard";
import { FaSearch } from "react-icons/fa";
import { API_BASE_URL } from "@/utils/api";

// Define Product type
type Product = {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  image?: string;
  discountPrice?: number | null;
  discount_price?: number | null;
  free_shipping?: boolean;
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only search if there's a query
    if (query) {
      fetchSearchResults(query);
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [query]);

  const fetchSearchResults = async (searchQuery: string) => {
    try {
      setLoading(true);
      // Updated API endpoint to use correct path and parameter name
      const response = await fetch(`${API_BASE_URL}/products/search?query=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform data to match our Product type
      const formattedProducts = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        imageUrl: item.image,
        discountPrice: item.discount_price,
        free_shipping: item.free_shipping
      }));
      
      setProducts(formattedProducts);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setError("خطا در جستجو. لطفا دوباره تلاش کنید.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <PrevPage title={`نتایج جستجو: ${query}`} />
      
      {/* Search status and summary */}
      <div className="p-4 bg-white">
        {loading ? (
          <p className="text-gray-500 text-center py-2">در حال جستجو...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-2">{error}</p>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {products.length === 0 
                ? "هیچ نتیجه‌ای یافت نشد" 
                : `${products.length} نتیجه برای "${query}"`}
            </p>
          </div>
        )}
      </div>
      
      {/* Search results */}
      {!loading && !error && (
        <div className="p-4">
          {products.length === 0 ? (
            <div className="text-center py-8">
              <FaSearch className="mx-auto text-gray-300 mb-4" size={50} />
              <p className="text-gray-500">نتیجه‌ای برای جستجوی شما یافت نشد.</p>
              <p className="text-gray-400 text-sm mt-2">کلمات کلیدی دیگری را امتحان کنید</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 