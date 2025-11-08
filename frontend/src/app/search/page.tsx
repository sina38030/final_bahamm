"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PrevPage from "@/components/common/PrevPage";
import ProductCard from "@/components/ProductCard";
import { Product as ProductCardType } from "@/data/products";
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

function SearchContent() {
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
    setLoading(true);
    setError(null);
    try {
      // Try preferred backend route first: /api/search?q=
      let res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      if (!res.ok) {
        // Fallback to products route: /api/products/search?query=
        res = await fetch(`${API_BASE_URL}/products/search?query=${encodeURIComponent(searchQuery)}`);
      }
      if (res.ok) {
        const data = await res.json();
        const arr: any[] = Array.isArray(data) ? data : [];
        const formattedProducts = arr.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          // Prefer discounted price if available, fallback to base/market
          price: item.discount_price ?? item.base_price ?? item.market_price ?? 0,
          imageUrl: item.image || item.image_url,
          image: item.image || item.image_url,
          discountPrice: item.discount_price ?? null,
          free_shipping: item.free_shipping ?? (item.shipping_cost === 0),
        }));
        setProducts(formattedProducts);
        return;
      }

      // Final fallback: fetch admin products and filter client-side
      const adminRes = await fetch(`${API_BASE_URL}/admin/products?limit=1000`);
      if (!adminRes.ok) {
        const text = await adminRes.text().catch(() => "");
        throw new Error(`Search failed with status: ${adminRes.status} ${text.slice(0, 120)}`);
      }
      const adminData = await adminRes.json();
      const list: any[] = Array.isArray(adminData) ? adminData : [];
      const q = searchQuery.trim().toLowerCase();
      const filtered = list.filter((p: any) => {
        try {
          return String(p.name || "").toLowerCase().includes(q) || String(p.description || "").toLowerCase().includes(q);
        } catch {
          return false;
        }
      });
      const formattedFromAdmin = filtered.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        price: p.discount_price ?? p.base_price ?? p.market_price ?? 0,
        imageUrl: (Array.isArray(p.images) && p.images[0]?.image_url) || p.image_url || p.image || "",
        image: (Array.isArray(p.images) && p.images[0]?.image_url) || p.image_url || p.image || "",
        discountPrice: p.discount_price ?? null,
        free_shipping: p.free_shipping ?? (p.shipping_cost === 0),
      }));
      setProducts(formattedFromAdmin);
    } catch (e) {
      console.error("Error fetching search results:", e);
      setError("خطا در جستجو. لطفا دوباره تلاش کنید.");
    } finally {
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
              {products.map((product) => {
                // Convert search result to ProductCard format
                const productCardData: ProductCardType = {
                  id: product.id,
                  cat: 'fruit', // default category
                  img: product.image || product.imageUrl || '',
                  name: product.name,
                  weight: '1 کیلوگرم', // default weight
                  star: '4.0', // default rating
                  sales: '0', // default sales
                  price: product.price,
                };
                return <ProductCard key={product.id} p={productCardData} />;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-4">در حال بارگذاری…</div>}>
      <SearchContent />
    </Suspense>
  );
}