"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PrevPage from "@/components/common/PrevPage";
import ProductCard from "@/components/ProductCard";
import { Product as ProductCardType } from "@/data/products";
import { FaSearch, FaTimes, FaArrowRight, FaFire, FaHistory } from "react-icons/fa";
import { API_BASE_URL } from "@/utils/api";
import CartBar from "@/components/CartBar";
import {
  addToSearchHistory,
  clearSearchHistory,
  getSearchHistory
} from "@/utils/searchHistory";

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
  const router = useRouter();
  const query = searchParams.get("q") || "";
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(query);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history and popular searches on mount
  useEffect(() => {
    try {
      setSearchHistory(getSearchHistory());
    } catch (err) {
      console.error("Error loading search history:", err);
    }

    // Fetch popular searches from backend
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/popular-searches`);
        if (response.ok) {
          const data = await response.json();
          setPopularSearches(data.map((item: any) => item.search_term));
        }
      } catch (err) {
        console.error("Error loading popular searches:", err);
        // Fallback to default searches if backend fails
        setPopularSearches([
          'سیب',
          'موز',
          'پرتقال',
          'انگور',
          'هندوانه',
          'گوجه'
        ]);
      }
    })();

    // Auto-focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    // Only search if there's a query
    if (query) {
      setSearchTerm(query);
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

  const handleSearch = (term: string) => {
    if (term.trim()) {
      // Add to search history
      const updatedHistory = addToSearchHistory(term.trim(), searchHistory);
      setSearchHistory(updatedHistory);
      // Navigate with query
      router.push(`/search?q=${encodeURIComponent(term.trim())}`);
    }
  };

  const handleClearSearchHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  const clearSearch = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Search Header */}
      <div className="sticky top-0 z-50 bg-white border-b">
        <div className="p-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-600 p-2"
          >
            <FaArrowRight size={20} />
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="جستجو در محصولات..."
              className="w-full p-3 pr-10 rounded-lg text-right shadow-sm bg-gray-100 border-none outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchTerm);
                }
              }}
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
              onClick={() => handleSearch(searchTerm)}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm"
            >
              جستجو
            </button>
          )}
        </div>
      </div>
      
      {/* Show suggestions when no query */}
      {!query && (
        <div className="p-4">
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
                    className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer shadow-sm"
                    onClick={() => {
                      setSearchTerm(term);
                      handleSearch(term);
                    }}
                  >
                    <div className="flex items-center">
                      <FaHistory className="text-gray-400 ml-2" />
                      <span>{term}</span>
                    </div>
                    <FaArrowRight className="text-gray-400 rotate-180" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Search results */}
      {query && (
        <div className="p-4 bg-white mb-2">
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
      )}
      
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
                  weight: (product as any).weight_grams ?? 1000,
                  // star and sales from admin-calculated display fields if present
                  star: (product as any).display_rating ?? 0,
                  sales: (product as any).display_sales ?? 0,
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
      
      {/* Floating cart bar to reflect add-to-cart actions */}
      <CartBar />
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