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
      const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
      const normalizeImg = (u?: string) => {
        if (!u) return "/images/404.png";
        try {
          if (/^https?:\/\//i.test(u)) return u;            // absolute URL
          if (u.startsWith('//')) return window.location.protocol + u;
          if (u.startsWith('/uploads')) return u;           // served by Next.js public on frontend
          if (u.startsWith('/static')) return `${apiOrigin}${u}`; // backend static mount
          if (u.startsWith('/')) return `${apiOrigin}${u}`; // other backend-relative paths
          return u;                                         // relative path (leave as-is)
        } catch {
          return "/images/404.png";
        }
      };
      // Try preferred backend route first: /api/search?q=
      let res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      if (!res.ok) {
        // Fallback to products route: /api/products/search?query=
        res = await fetch(`${API_BASE_URL}/products/search?query=${encodeURIComponent(searchQuery)}`);
      }
      if (res.ok) {
        const data = await res.json();
        const arr: any[] = Array.isArray(data) ? data : [];
        // Try to enrich with admin products (images, display_rating/sales, weights)
        let adminMap: Record<number, any> = {};
        try {
          const adminRes = await fetch(`${API_BASE_URL}/admin/products?limit=1000`);
          if (adminRes.ok) {
            const adminList = await adminRes.json();
            if (Array.isArray(adminList)) {
              adminMap = Object.fromEntries(adminList.map((p: any) => [Number(p.id), p]));
            }
          }
        } catch {}
        const formattedProducts = arr.map((item: any) => {
          const solo = Number(item?.solo_price ?? item?.market_price ?? item?.discount_price ?? item?.base_price ?? 0) || 0;
          const base = Number(item?.friend_1_price ?? item?.base_price ?? 0) || (solo > 0 ? Math.round(solo * 0.7) : 0);
          const friend2 = Number(item?.friend_2_price ?? 0) || Math.floor(base * 0.9);
          const admin = adminMap[Number(item?.id)] || {};
          const imgRaw = (admin?.images && Array.isArray(admin.images) && admin.images[0]) || item?.image || item?.image_url || '';
          const img = normalizeImg(imgRaw);
          const display_rating = Number(admin?.display_rating ?? 0) || 0;
          const display_sales  = Number(admin?.display_sales ?? 0) || 0;
          const weight_grams = admin?.weight_grams ?? null;
          const weight_tolerance_grams = admin?.weight_tolerance_grams ?? null;
          return {
            id: item.id,
            name: item.name,
            description: item.description || "",
            // Price used by ProductCard for main display
            price: base || solo || 0,
            imageUrl: img || "/images/404.png",
            image: img || "/images/404.png",
            discountPrice: item.discount_price ?? null,
            free_shipping: item.free_shipping ?? (item.shipping_cost === 0),
            // Enrich with admin-style fields so ProductCard can render price options
            base_price: item.base_price ?? base ?? 0,
            market_price: item.market_price ?? solo ?? 0,
            solo_price: solo,
            friend_1_price: base,
            friend_2_price: friend2,
            friend_3_price: 0,
            images: (admin?.images && Array.isArray(admin.images)) ? admin.images.map((u: string) => normalizeImg(u)) : (img ? [img] : []),
            display_rating,
            display_sales,
            weight_grams,
            weight_tolerance_grams,
          };
        });
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
      const formattedFromAdmin = filtered.map((p: any) => {
        const solo = Number(p?.solo_price ?? p?.market_price ?? p?.discount_price ?? p?.base_price ?? 0) || 0;
        const base = Number(p?.friend_1_price ?? p?.base_price ?? 0) || (solo > 0 ? Math.round(solo * 0.7) : 0);
        const friend2 = Number(p?.friend_2_price ?? 0) || Math.floor(base * 0.9);
        const img = normalizeImg((Array.isArray(p.images) && p.images[0]?.image_url) || p.image_url || p.image || '');
        return {
          id: p.id,
          name: p.name,
          description: p.description || "",
          price: base || solo || 0,
          imageUrl: img || "/images/404.png",
          image: img || "/images/404.png",
          discountPrice: p.discount_price ?? null,
          free_shipping: p.free_shipping ?? (p.shipping_cost === 0),
          base_price: p.base_price ?? base ?? 0,
          market_price: p.market_price ?? solo ?? 0,
          solo_price: solo,
          friend_1_price: p.friend_1_price ?? base,
          friend_2_price: p.friend_2_price ?? friend2,
          friend_3_price: p.friend_3_price ?? 0,
          images: Array.isArray(p?.images) ? p.images.map((u: string) => normalizeImg(u)) : (img ? [img] : []),
          display_rating: p.display_rating ?? 0,
          display_sales: p.display_sales ?? 0,
          weight_grams: p.weight_grams ?? null,
          weight_tolerance_grams: p.weight_tolerance_grams ?? null,
        };
      });
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
                  // Prefer numeric grams; ProductCard will format
                  weight: (product as any).weight_grams ?? '1 کیلوگرم',
                  // star and sales from admin-calculated display fields if present
                  star: (product as any).display_rating ?? '4.0',
                  sales: (product as any).display_sales ?? '0',
                  // Use friend_1/base as primary price for card
                  price: (product as any).friend_1_price ?? product.price ?? (product as any).base_price ?? 0,
                };
                // Enrich with admin-style fields so ProductCard can render proper prices
                (productCardData as any).base_price    = (product as any).base_price ?? product.price ?? 0;
                (productCardData as any).market_price  = (product as any).market_price ?? (product as any).solo_price ?? (product as any).discount_price ?? (product as any).base_price ?? product.price ?? 0;
                (productCardData as any).solo_price    = (product as any).solo_price ?? (product as any).market_price ?? (product as any).discount_price ?? (product as any).base_price ?? product.price ?? 0;
                (productCardData as any).friend_1_price= (product as any).friend_1_price ?? (product as any).base_price ?? product.price ?? 0;
                (productCardData as any).friend_2_price= (product as any).friend_2_price ?? 0;
                (productCardData as any).friend_3_price= (product as any).friend_3_price ?? 0;
                // Provide tolerance in the name ProductCard expects
                (productCardData as any).weight_tolerance = (product as any).weight_tolerance_grams ?? undefined;
                // Pass images array if available to improve modal slider
                (productCardData as any).images = (product as any).images || (product.image ? [product.image] : (product.imageUrl ? [product.imageUrl] : []));

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