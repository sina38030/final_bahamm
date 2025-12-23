/* --------------------------------------------------------------------------
   AdminPage.tsx – robust version with category creation + reliable product add
   -------------------------------------------------------------------------- */

   "use client";

   import React from "react";
   import { useEffect, useState, useCallback } from "react";
   import { toTehranTime, toTehranDate, toTehranDateTime } from "@/utils/dateUtils";
import {
 FaTachometerAlt,
 FaBoxes,
 FaTags,
 FaShoppingCart,
 FaUsers,
 FaBars,
 FaTimes,
 FaEye,
 FaUserFriends,
 FaExclamationTriangle,
 FaComments,
 FaClock,
 FaFire,
 FaCheckCircle,
} from "react-icons/fa";
import { toFa } from "@/utils/toFa";
import SettlementsContent from "@/components/SettlementsContent";
import Image from "next/image";
import { API_BASE_URL } from "@/utils/api";
import { syncTokenFromURL } from "@/utils/crossDomainAuth";

// Force dynamic rendering - do not pre-render this page at build time
export const dynamic = 'force-dynamic';
   
   /* --------------------------------------------------------------------------
      Config - Backend URL computed at runtime
      -------------------------------------------------------------------------- */
   
  // Lazy-computed backend URL (cached after first access)
  let _cachedAdminApiBaseUrl: string | null = null;
  
  function getAdminApiBaseUrl(): string {
    if (_cachedAdminApiBaseUrl) return _cachedAdminApiBaseUrl;
    
  if (typeof window === 'undefined') {
    // Server-side: use HTTPS for staging
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      return envUrl;
    }
    return "http://localhost:8001/api";
  }
  
  // Client-side: use env var or construct from current location
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (envUrl) {
    console.log('[Admin] Using env URL:', envUrl);
    _cachedAdminApiBaseUrl = envUrl;
    return envUrl;
  }
  
  // Fallback: auto-detect based on environment
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname;
  let apiUrl: string;

  // Production: use nginx reverse proxy path
  if (hostname === 'bahamm.ir' || hostname === 'www.bahamm.ir') {
    apiUrl = `${protocol}//${hostname}/backend/api`;
    console.log('[Admin] Production URL (nginx proxy):', apiUrl);
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Development: direct connection to backend port
    apiUrl = `${protocol}//${hostname}:8001/api`;
    console.log('[Admin] Development URL (direct):', apiUrl);
  } else {
    // Unknown environment, try backend via nginx
    apiUrl = `${protocol}//${hostname}/backend/api`;
    console.log('[Admin] Fallback URL:', apiUrl);
  }
  
  console.log('[Admin] Final API Base URL:', apiUrl);
  _cachedAdminApiBaseUrl = apiUrl;
  return apiUrl;
  }
  
  // Computed lazily inside the component - DO NOT call at module level
  let ADMIN_API_BASE_URL = "";
   
/** Using Bearer token auth from localStorage (not cookies)
 * This allows cross-domain authentication between bahamm.ir and app.bahamm.ir
 */
const API_INIT: RequestInit = {
  headers: {
    Accept: "application/json",
  },
  // Removed credentials: "include" to avoid cookie issues with cross-domain
};

const AUTH_TOKEN_KEY = "auth_token";

const getAdminAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(AUTH_TOKEN_KEY);
};
   
 type Section =
   | "dashboard"
   | "products"
   | "categories"
   | "settings"
   | "banners"
   | "orders"
   | "users"
   | "group-buys"
   | "secondary-group-buys"
   | "settlements"
   | "messages"
   | "delivery-slots"
   | "reviews"
   | "pending-reviews"
   | "popular-searches";
   
   /* --------------------------------------------------------------------------
      Shared types
      -------------------------------------------------------------------------- */
   
   interface DashboardStats {
     total_users: number;
     total_products: number;
     total_orders: number;
     total_categories: number;
     recent_orders: number;
     total_revenue: number;
   }
   
   interface OrderItem {
     id: number;
     product_id: number;
     product_name: string;
     quantity: number;
     base_price: number;
     total_price: number;
   }
   
   interface ParticipantOrder {
     order_id: number;
     user_id: number | null;
     user_name: string;
     user_phone: string;
     items: OrderItem[];
     total_amount: number;
   }
   
   interface OrderDetail {
     id: number;
     user_id: number;
     user_name: string;
     user_phone: string;
     user_email?: string;
     total_amount: number;
     status: string;
     created_at: string;
     items: OrderItem[];
     shipping_address?: string;
     delivery_slot?: string;
     payment_method?: string;
     group_order_id?: number;
     consolidated?: boolean;
     participants?: ParticipantOrder[];
   }
   
   /* --------------------------------------------------------------------------
      Helpers
      -------------------------------------------------------------------------- */
   
   function isAbort(err: unknown): boolean {
     return (
       (err instanceof DOMException && err.name === "AbortError") ||
       (!!err &&
         typeof err === "object" &&
         "name" in (err as any) &&
         (err as any).name === "AbortError")
     );
   }

   // Normalize Persian/Arabic digits to English for numeric fields
   const toEnDigits = (s: string) => {
     if (!s) return "";
     const map: Record<string, string> = {
       "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
       "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
       "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
       "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
     };
     return String(s).replace(/[۰-۹٠-٩]/g, (d) => map[d] ?? d);
   };
   
   async function fetchJSON<T>(
     url: string,
     init?: RequestInit,
     signal?: AbortSignal
   ): Promise<T> {
     console.log('fetchJSON called with URL:', url);
     // Attach Bearer token if present (admin chat endpoints require auth)
     const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
     const mergedHeaders: HeadersInit = {
       ...(API_INIT.headers as any),
       ...(init?.headers as any),
       ...(token ? { Authorization: `Bearer ${token}` } : {}),
     };
     const mergedInit = { ...API_INIT, ...init, headers: mergedHeaders, signal } as RequestInit;
     console.log('fetchJSON config:', { hasSignal: !!signal });
     const res = await fetch(url, mergedInit);
     console.log('fetchJSON response:', res.status, res.statusText);
   
     // Read body once for reuse in error or JSON parse
     let raw = "";
     try {
       raw = await res.clone().text();
     } catch {
       /* ignore */
     }
   
     if (!res.ok) {
       let detail: any = raw;
       try {
         detail = JSON.parse(raw);
       } catch {
         /* not JSON */
       }
       const msg =
         typeof detail === "string"
           ? detail
           : detail?.message || detail?.error || detail?.detail || "";
       const err = new Error(
         `${res.status} ${res.statusText}${msg ? ` – ${msg}` : ""}`
       );
       (err as any).status = res.status;
       (err as any).url = url;
       (err as any).body = detail || raw;
       throw err;
     }
   
     try {
       return (await res.json()) as T;
     } catch {
       return JSON.parse(raw) as T;
     }
   }
   
   function qs(params: Record<string, string | number | undefined>): string {
     const search = new URLSearchParams();
     Object.entries(params).forEach(([k, v]) => {
       if (v !== undefined && v !== "") search.append(k, String(v));
     });
     const s = search.toString();
     return s ? `?${s}` : "";
   }
   
   /* --------------------------------------------------------------------------
      Root component
      -------------------------------------------------------------------------- */
   
   export default function AdminPage() {
     // Initialize API base URL on client side only
     if (typeof window !== 'undefined' && !ADMIN_API_BASE_URL) {
       ADMIN_API_BASE_URL = getAdminApiBaseUrl();
     }
   
     const [activeSection, setActiveSection] = useState<Section>("dashboard");
     const [sidebarOpen, setSidebarOpen] = useState(true);
     const [loading, setLoading] = useState(false);
     const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
       null
     );
     const [dashError, setDashError] = useState<string | null>(null);
   
     /* ---------------- Cross-Domain Auth Sync */
     useEffect(() => {
       // Sync authentication token from URL if present (for cross-domain navigation)
       const tokenSynced = syncTokenFromURL();
       if (tokenSynced) {
         console.log('[Admin-Full] Token synced from URL for cross-domain auth');
       }
     }, []);
   
     /* ---------------- Dashboard load */
     useEffect(() => {
       if (activeSection !== "dashboard") return;
       const ctrl = new AbortController();
       let alive = true;
   
       (async () => {
         try {
           setLoading(true);
           setDashError(null);
           console.log('Fetching dashboard from:', `${ADMIN_API_BASE_URL}/admin/dashboard`);
           const data = await fetchJSON<DashboardStats>(
             `${ADMIN_API_BASE_URL}/admin/dashboard`,
             undefined,
             ctrl.signal
           );
           console.log('Dashboard data received:', data);
           if (!alive) return;
           setDashboardStats(data);
         } catch (err: any) {
           if (!isAbort(err)) {
             console.error("Dashboard error:", err);
             if (alive) {
               setDashError(err?.message ?? "خطای ناشناخته");
               setDashboardStats({
                 total_users: 0,
                 total_products: 0,
                 total_orders: 0,
                 total_categories: 0,
                 recent_orders: 0,
                 total_revenue: 0,
               });
             }
           }
         } finally {
           if (alive) setLoading(false);
         }
       })();
   
       return () => {
         alive = false;
         ctrl.abort();
       };
     }, [activeSection]);
   
     /* ---------------- Nav items */
  const menuItems = [
    { id: "dashboard" as Section, label: "داشبورد", icon: FaTachometerAlt },
    { id: "products" as Section, label: "محصولات", icon: FaBoxes },
    { id: "categories" as Section, label: "دسته‌بندی‌ها", icon: FaTags },
    { id: "delivery-slots" as Section, label: "بازه‌های تحویل", icon: FaClock },
    { id: "settings" as Section, label: "تنظیمات", icon: FaBars },
     { id: "banners" as Section, label: "بنرها", icon: FaTags },
    { id: "orders" as Section, label: "سفارشات", icon: FaShoppingCart },
    { id: "users" as Section, label: "کاربران", icon: FaUsers },
    { id: "group-buys" as Section, label: "خرید گروهی", icon: FaUserFriends },
    { id: "secondary-group-buys" as Section, label: "خرید گروهی ثانویه", icon: FaUserFriends },
    { id: "settlements" as Section, label: "تسویه‌های گروهی", icon: FaExclamationTriangle },
    { id: "messages" as Section, label: "پیام‌ها", icon: FaComments },
    { id: "reviews" as Section, label: "نظرات فیک", icon: FaComments },
    { id: "pending-reviews" as Section, label: "نظرات کاربران", icon: FaCheckCircle },
    { id: "popular-searches" as Section, label: "جستجوهای پرطرفدار", icon: FaFire },
  ];
   
     const renderContent = () => {
       switch (activeSection) {
         case "dashboard":
           return (
             <DashboardContent stats={dashboardStats} loading={loading} error={dashError} />
           );
         case "products":
           return <ProductsContent />;
         case "categories":
           return <CategoriesContent />;
        case "settings":
          return <SettingsContent />;
        case "banners":
          return <BannersContent />;
         case "orders":
           return <OrdersContent />;
         case "users":
           return <UsersContent />;
         case "messages":
           return <MessagesContent />;
                 case "group-buys":
          return <GroupBuysContent />;
        case "secondary-group-buys":
          return <SecondaryGroupBuysContent />;
        case "settlements":
          return <SettlementsContent />;
        case "delivery-slots":
          return <DeliverySlotsContent />;
       case "reviews":
         return <ReviewsContent />;
       case "pending-reviews":
         return <PendingReviewsContent />;
       case "popular-searches":
         return <PopularSearchesContent />;
       default:
         return null;
      }
     };
   
     /* ---------------- Layout */
     return (
       <div className="flex h-screen bg-gray-100" style={{ direction: "rtl" }}>
         {/* Sidebar */}
         <div
           className={`${
             sidebarOpen ? "w-64" : "w-0"
           } transition-all duration-300 bg-blue-600 text-white overflow-hidden`}
         >
           <div className="p-4">
             <h2 className="text-2xl font-bold mb-8">پنل مدیریت</h2>
             <nav>
               {menuItems.map((item) => {
                 const Icon = item.icon;
                 return (
                   <button
                     key={item.id}
                     onClick={() => setActiveSection(item.id)}
                     className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${
                       activeSection === item.id
                         ? "bg-blue-700"
                         : "hover:bg-blue-500"
                     }`}
                   >
                     <Icon className="text-xl" />
                     <span>{item.label}</span>
                   </button>
                 );
               })}
             </nav>
           </div>
         </div>
   
         {/* Main */}
         <div className="flex-1 overflow-auto">
           <div className="bg-white shadow-sm p-4 flex items-center justify-between">
             <button
               onClick={() => setSidebarOpen(!sidebarOpen)}
               className="text-gray-600 hover:text-gray-800"
             >
               {sidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
             </button>
             <h1 className="text-xl font-semibold">
               {menuItems.find((i) => i.id === activeSection)?.label}
             </h1>
           </div>
   
           <div className="p-6">{renderContent()}</div>
         </div>
       </div>
     );
   }
   
   /* --------------------------------------------------------------------------
      Messages (Support Chat)
      -------------------------------------------------------------------------- */

   function MessagesContent() {
     const [conversations, setConversations] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
     const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
     const [selectedUserInfo, setSelectedUserInfo] = useState<{name?: string; phone?: string} | null>(null);
     const [messages, setMessages] = useState<{ id: number; sender: 'user' | 'admin'; message: string; timestamp: string }[]>([]);
     const [input, setInput] = useState('');
     const [sending, setSending] = useState(false);
     const [polling, setPolling] = useState<ReturnType<typeof setInterval> | null>(null);

     // Load conversations
     useEffect(() => {
       const ctrl = new AbortController();
       let alive = true;
       (async () => {
         try {
           setLoading(true);
           setError(null);
           const data = await fetchJSON<any[]>(`${ADMIN_API_BASE_URL}/chat/admin/conversations`, undefined, ctrl.signal);
           if (!alive) return;
           setConversations(Array.isArray(data) ? data : []);
         } catch (err: any) {
           if (!isAbort(err)) {
             console.error('Conversations error:', err);
             if (alive) setError(err?.message ?? 'خطای ناشناخته');
           }
         } finally {
           if (alive) setLoading(false);
         }
       })();
       return () => {
         alive = false;
         ctrl.abort();
       };
     }, []);

     // Load messages for selected conversation with polling
     useEffect(() => {
       if (!selectedUserId) return;
       let alive = true;
       const load = async () => {
         try {
           const data = await fetchJSON<any[]>(`${ADMIN_API_BASE_URL}/chat/admin/conversations/${selectedUserId}`);
           if (!alive) return;
           setMessages(Array.isArray(data) ? data : []);
           // Mark user messages as seen by admin
           try {
             await fetchJSON(`${ADMIN_API_BASE_URL}/chat/admin/conversations/${selectedUserId}/seen`, { method: 'POST' });
           } catch {}
         } catch (err) {
           if (!isAbort(err)) console.error('Conversation load error:', err);
         }
       };
       load();
       const id = setInterval(load, 2000);
       setPolling(id);
       return () => {
         alive = false;
         if (id) clearInterval(id);
         setPolling(null);
       };
     }, [selectedUserId]);

     const handleSelect = (c: any) => {
       setSelectedUserId(c.user_id);
       setSelectedUserInfo({ name: c.name, phone: c.phone });
     };

     const handleSend = async () => {
       if (!selectedUserId) return;
       const text = input.trim();
       if (!text || sending) return;
       setSending(true);
       try {
         await fetchJSON(`${ADMIN_API_BASE_URL}/chat/admin/conversations/${selectedUserId}/send`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ message: text })
         });
         setInput('');
         // Refresh messages immediately
         const data = await fetchJSON<any[]>(`${ADMIN_API_BASE_URL}/chat/admin/conversations/${selectedUserId}`);
         setMessages(Array.isArray(data) ? data : []);
       } catch (err) {
         console.error('Send message error:', err);
         alert('ارسال پیام ناموفق بود');
       } finally {
         setSending(false);
       }
     };

     return (
       <div className="bg-white rounded-lg shadow-md h-[calc(100vh-160px)] flex">
         {/* Conversations list */}
         <div className="w-80 border-l overflow-y-auto">
           <div className="p-4 border-b font-semibold">گفتگوها</div>
           {loading ? (
             <div className="p-4 text-sm text-gray-500">در حال بارگذاری...</div>
           ) : error ? (
             <div className="p-4 text-sm text-red-600">{error}</div>
           ) : conversations.length === 0 ? (
             <div className="p-4 text-sm text-gray-500">گفتگویی وجود ندارد</div>
           ) : (
             <ul>
               {conversations.map((c) => (
                 <li key={c.user_id}>
                   <button
                     onClick={() => handleSelect(c)}
                     className={`w-full text-right px-4 py-3 border-b hover:bg-gray-50 ${selectedUserId === c.user_id ? 'bg-gray-50' : ''}`}
                   >
                     <div className="font-medium">{c.name || c.phone || `کاربر #${c.user_id}`}</div>
                     <div className="text-xs text-gray-500 truncate">{c.last_message}</div>
                   </button>
                 </li>
               ))}
             </ul>
           )}
         </div>

         {/* Conversation thread */}
         <div className="flex-1 flex flex-col">
           <div className="p-4 border-b">
             {selectedUserId ? (
               <div className="font-semibold">
                 گفتگو با {selectedUserInfo?.name || selectedUserInfo?.phone || `کاربر #${selectedUserId}`}
               </div>
             ) : (
               <div className="text-gray-500">یک گفتگو را انتخاب کنید</div>
             )}
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
             {selectedUserId ? (
               messages.map((m) => (
                 <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`${m.sender === 'admin' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'} px-3 py-2 rounded-xl max-w-[75%] shadow`}>
                     <div className="whitespace-pre-wrap break-words text-sm">{m.message}</div>
                     <div className="text-[10px] mt-1 opacity-70 text-right">{toTehranTime(m.timestamp)}</div>
                   </div>
                 </div>
               ))
             ) : null}
           </div>
           <div className="p-3 border-t flex items-end gap-2 bg-white">
             <textarea
               disabled={!selectedUserId}
               className="flex-1 border rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 max-h-40 min-h-[42px] disabled:bg-gray-100"
               rows={1}
               placeholder={selectedUserId ? 'نوشتن پیام...' : 'یک گفتگو را انتخاب کنید'}
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSend();
                 }
               }}
             />
             <button
               disabled={!selectedUserId || sending || !input.trim()}
               className={`px-4 py-2 rounded-md text-white ${!selectedUserId || sending || !input.trim() ? 'bg-gray-300' : 'bg-blue-600'}`}
               onClick={handleSend}
             >
               ارسال
             </button>
           </div>
         </div>
       </div>
     );
   }

   /* --------------------------------------------------------------------------
      Dashboard content
      -------------------------------------------------------------------------- */
   
   function DashboardContent({
     stats,
     loading,
     error,
   }: {
     stats: DashboardStats | null;
     loading: boolean;
     error: string | null;
   }) {
     if (loading) return <div className="text-center py-8">در حال بارگذاری...</div>;
     if (error)
       return (
         <div className="text-center py-8 text-red-600">
           خطا در دریافت داشبورد: {error}
         </div>
       );
     if (!stats)
       return (
         <div className="text-center py-8 text-red-600">
           اطلاعات داشبورد موجود نیست
         </div>
       );
   
     const cards: { title: string; value: number; color: string }[] = [
       { title: "کل کاربران", value: stats.total_users, color: "bg-blue-500" },
       { title: "کل محصولات", value: stats.total_products, color: "bg-green-500" },
       { title: "کل سفارشات", value: stats.total_orders, color: "bg-yellow-500" },
       { title: "کل دسته‌بندی‌ها", value: stats.total_categories, color: "bg-purple-500" },
       { title: "سفارشات اخیر (7 روز)", value: stats.recent_orders, color: "bg-red-500" },
       { title: "درآمد کل", value: stats.total_revenue, color: "bg-indigo-500" },
     ];
   
     return (
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {cards.map((c) => (
           <div key={c.title} className="bg-white rounded-lg shadow-md p-6">
             <div className={`w-12 h-12 ${c.color} rounded-lg mb-4`} />
             <h3 className="text-gray-600 text-sm mb-2">{c.title}</h3>
             <p className="text-2xl font-bold">{toFa(c.value)}</p>
           </div>
         ))}
       </div>
     );
   }
   
   /* --------------------------------------------------------------------------
      Products
      -------------------------------------------------------------------------- */
   
   function ProductsContent() {
     const [products, setProducts] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
     const [search, setSearch] = useState("");
         const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(false);
    const [newProduct, setNewProduct] = useState({
      name: "",
      category_id: "",
      original_price: "",
      product_cost: "",
      solo_price: "",
      friend_1_price: "",
      friend_2_price: "",
      friend_3_price: "0",
      weight_grams: "",
      weight_tolerance_grams: "",
      sales_seed_offset: "",
      rating_seed_sum: "",
      rating_seed_avg: "",
      image_url: "",
      extra_image_urls: "",
    });
    const [editProduct, setEditProduct] = useState({
      name: "",
      category_id: "",
      original_price: "",
      product_cost: "",
      solo_price: "",
      friend_1_price: "",
      friend_2_price: "",
      friend_3_price: "0",
      weight_grams: "",
      weight_tolerance_grams: "",
      sales_seed_offset: "",
      rating_seed_sum: "",
      rating_seed_avg: "",
      image_url: "",
      extra_image_urls: "",
      home_position: "",
      landing_position: "",
    });
    const [positionEdits, setPositionEdits] = useState<Record<number, { home: string; landing: string; saving?: boolean; dirty?: boolean }>>({});
    const [mainImage, setMainImage] = useState<File | null>(null);
    const [images, setImages] = useState<File[] | null>(null);
    const [reload, setReload] = useState(0);
    const [editMainImage, setEditMainImage] = useState<File | null>(null);
    const [editImages, setEditImages] = useState<FileList | null>(null);
    const [editImagesList, setEditImagesList] = useState<{ id: number; image_url: string; is_main?: boolean }[]>([]);
    const [addImageFile, setAddImageFile] = useState<File | null>(null);
    const [addImageUrl, setAddImageUrl] = useState("");
    const [addingImage, setAddingImage] = useState(false);
    const [deletingImageIds, setDeletingImageIds] = useState<Record<number, boolean>>({});
   
     const loadProducts = useCallback(
       (signal?: AbortSignal) => {
         const query = qs({ search });
         return fetchJSON<any[]>(
           `${ADMIN_API_BASE_URL}/admin/products${query}`,
           undefined,
           signal
         ).then((data) => {
           setProducts(data);
           try {
             const map: Record<number, { home: string; landing: string; saving?: boolean; dirty?: boolean }> = {};
             (data || []).forEach((p: any) => {
               if (p && typeof p.id === 'number') {
                 map[p.id] = { home: (p.home_position ?? '').toString(), landing: (p.landing_position ?? '').toString(), saving: false, dirty: false };
               }
             });
             setPositionEdits(map);
           } catch {}
         });
       },
       [search]
     );
   
     /* --- list */
     useEffect(() => {
       const ctrl = new AbortController();
       let alive = true;
   
       (async () => {
         try {
           setLoading(true);
           setError(null);
           await loadProducts(ctrl.signal);
         } catch (err: any) {
           if (!isAbort(err)) {
             console.error("Products error:", err);
             if (alive) setError(err?.message ?? "خطای ناشناخته");
           }
         } finally {
           if (alive) setLoading(false);
         }
       })();
   
       return () => {
         alive = false;
         ctrl.abort();
       };
     }, [search, reload, loadProducts]);
   
     /* --- categories when modal open (for select box) */
     useEffect(() => {
       if (!showAddModal) return;
       const ctrl = new AbortController();
       let alive = true;
   
       (async () => {
         try {
           const data = await fetchJSON<any[]>(
             `${ADMIN_API_BASE_URL}/admin/categories`,
             undefined,
             ctrl.signal
           );
           if (!alive) return;
           setCategories(data);
         } catch (err) {
           if (!isAbort(err)) console.error("Categories error:", err);
         }
       })();
   
       return () => {
         alive = false;
         ctrl.abort();
       };
     }, [showAddModal]);

  // Load categories when edit modal opens as well
  useEffect(() => {
    if (!showEditModal) return;
    const ctrl = new AbortController();
    let alive = true;
    (async () => {
      try {
        const data = await fetchJSON<any[]>(
          `${ADMIN_API_BASE_URL}/admin/categories`,
          undefined,
          ctrl.signal
        );
        if (!alive) return;
        setCategories(data);
      } catch (err) {
        if (!isAbort(err)) console.error("Categories error:", err);
      }
    })();
    return () => {
      alive = false;
      ctrl.abort();
    };
    }, [showEditModal]);

    /* --- delete */
     const handleDelete = async (id: number) => {
       if (!confirm("آیا از حذف این محصول اطمینان دارید؟")) return;
       try {
         const res = await fetch(`${ADMIN_API_BASE_URL}/admin/products/${id}`, {
           method: "DELETE",
           ...API_INIT,
         });
         if (!res.ok) {
           const text = await res.text().catch(() => "");
           throw new Error(`${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
         }
         setProducts((p) => p.filter((x) => x.id !== id));
       } catch (err) {
         console.error("Delete error:", err);
         alert("خطا در حذف محصول");
       }
         };

    /* --- edit product */
    const handleEditProduct = (product: any) => {
      setEditingProduct(product);
      setEditProduct({
        name: product.name || "",
        category_id: product.category_id?.toString() || "",
        original_price: product.market_price?.toString() || "0",
        product_cost: product.product_cost?.toString() || "0",
        solo_price: product.solo_price?.toString() || "0",
        friend_1_price: product.friend_1_price?.toString() || "0",
        friend_2_price: product.friend_2_price?.toString() || "0",
        friend_3_price: "0",  // Always zero for 3 friends
        weight_grams: (product.weight_grams ?? "").toString(),
        weight_tolerance_grams: (product.weight_tolerance_grams ?? "").toString(),
        sales_seed_offset: (product.sales_seed_offset ?? "").toString(),
        rating_seed_sum: (product.rating_seed_sum ?? "").toString(),

        rating_seed_avg: (product.display_rating ?? "").toString(),
        image_url: (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : ""),
        extra_image_urls: "",
        home_position: (product.home_position ?? "").toString(),
        landing_position: (product.landing_position ?? "").toString(),
      });
      setEditMainImage(null);
      setEditImages(null);
      setEditImagesList([]);
      // Load existing images for this product
      (async () => {
        try {
          const data = await fetchJSON<{ product_id: number; images: { id: number; image_url: string; is_main?: boolean }[] }>(
            `${ADMIN_API_BASE_URL}/admin/products/${product.id}/images`
          );
          setEditImagesList(Array.isArray(data?.images) ? data.images : []);
        } catch (e) {
          console.error("load images error", e);
          setEditImagesList([]);
        }
      })();
      setShowEditModal(true);
    };

    const reloadEditImages = async () => {
      if (!editingProduct?.id) return;
      try {
        const url = `${ADMIN_API_BASE_URL}/admin/products/${editingProduct.id}/images`;
        console.log('Reloading images from:', url);
        const data = await fetchJSON<{ product_id: number; images: { id: number; image_url: string; is_main?: boolean }[] }>(url);
        console.log('Reloaded images data:', data);
        setEditImagesList(Array.isArray(data?.images) ? data.images : []);
      } catch (e) {
        console.error("reload images error", e);
      }
    };

    const handleDeleteImage = async (imgId: number) => {
      if (!editingProduct?.id) return;
      if (!confirm("این تصویر حذف شود؟")) return;
      try {
        setDeletingImageIds((prev) => ({ ...prev, [imgId]: true }));
        const res = await fetch(`${ADMIN_API_BASE_URL}/admin/products/${editingProduct.id}/images/${imgId}`, {
          method: "DELETE",
          credentials: API_INIT.credentials,
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText} ${t}`);
        }
        setEditImagesList((prev) => prev.filter((x) => x.id !== imgId));
      } catch (e) {
        console.error(e);
        alert("حذف تصویر ناموفق بود");
      } finally {
        setDeletingImageIds((prev) => ({ ...prev, [imgId]: false }));
      }
    };

    const handleSetMainImage = async (imgId: number) => {
      if (!editingProduct?.id) return;
      try {
        const res = await fetch(`${ADMIN_API_BASE_URL}/admin/products/${editingProduct.id}/images/${imgId}/main`, {
          method: "PUT",
          credentials: API_INIT.credentials,
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText} ${t}`);
        }
        setEditImagesList((prev) => prev.map((x) => ({ ...x, is_main: x.id === imgId })));
      } catch (e) {
        console.error(e);
        alert("تعیین تصویر اصلی ناموفق بود");
      }
    };

    const handleAddImage = async () => {
      if (!editingProduct?.id) return;
      if (!addImageFile && !addImageUrl.trim()) {
        alert("فایل یا لینک تصویر را وارد کنید");
        return;
      }
      try {
        setAddingImage(true);
        let res: Response;
        const url = `${ADMIN_API_BASE_URL}/admin/products/${editingProduct.id}/images`;
        console.log('Adding image to:', url);
        if (addImageFile) {
          const fd = new FormData();
          fd.append("image", addImageFile);
          console.log('Uploading file:', addImageFile.name);
          res = await fetch(url, {
            method: "POST",
            body: fd,
            credentials: API_INIT.credentials,
          });
        } else {
          console.log('Adding image URL:', addImageUrl.trim());
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: API_INIT.credentials,
            body: JSON.stringify({ image_url: addImageUrl.trim() }),
          });
        }
        console.log('Add image response:', res.status, res.statusText);
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.error('Add image error response:', t);
          throw new Error(`${res.status} ${res.statusText} ${t}`);
        }
        const created = await res.json().catch(() => null);
        console.log('Created image:', created);
        if (created && created.id) {
          setEditImagesList((prev) => [{ id: created.id, image_url: created.image_url, is_main: created.is_main }, ...prev]);
        } else {
          await reloadEditImages();
        }
        setAddImageFile(null);
        setAddImageUrl("");
        alert("تصویر با موفقیت اضافه شد");
      } catch (e) {
        console.error('handleAddImage error:', e);
        alert(`افزودن تصویر ناموفق بود: ${(e as Error).message}`);
      } finally {
        setAddingImage(false);
      }
    };

    const handleUpdateProduct = async () => {
      if (!editProduct.name.trim()) {
        alert("نام محصول را وارد کنید.");
        return;
      }
      if (!editProduct.category_id) {
        alert("دسته‌بندی محصول را انتخاب کنید.");
        return;
      }

      try {
        setEditing(true);
        const formData = new FormData();
        formData.append("name", editProduct.name);
        formData.append("category_id", editProduct.category_id);
        // Explicit original price field mapped to market_price
        formData.append("market_price", editProduct.original_price);
        formData.append("product_cost", editProduct.product_cost);
        formData.append("solo_price", editProduct.solo_price);
        formData.append("friend_1_price", editProduct.friend_1_price);
        formData.append("friend_2_price", editProduct.friend_2_price);
        formData.append("friend_3_price", "0");  // Always zero for 3 friends
        
        // Image handling: prioritize file uploads over URLs
        if (editMainImage) {
          formData.append("main_image", editMainImage);
          console.log("Sending editMainImage file:", editMainImage.name);
        } else if (editProduct.image_url && editProduct.image_url.trim()) {
          formData.append('image_url', editProduct.image_url.trim());
          console.log("Sending edit image_url:", editProduct.image_url.trim());
        }
        
        if (editImages && editImages.length > 0) {
          Array.from(editImages).forEach((f) => formData.append("images", f));
          console.log("Sending edit extra images files:", editImages.length);
        } else if (editProduct.extra_image_urls && editProduct.extra_image_urls.trim()) {
          formData.append('extra_image_urls', editProduct.extra_image_urls.trim());
          console.log("Sending edit extra_image_urls:", editProduct.extra_image_urls.trim());
        }
        
        // optional fields
        if (editProduct.weight_grams) formData.append("weight_grams", editProduct.weight_grams);
        if (editProduct.weight_tolerance_grams) formData.append("weight_tolerance_grams", editProduct.weight_tolerance_grams);
        if (editProduct.sales_seed_offset) formData.append("sales_seed_offset", editProduct.sales_seed_offset);
        // Rating seed: if average provided, compute sum = avg * count
        let seedSum = editProduct.rating_seed_sum;
        if (editProduct.rating_seed_avg) {
          const avg = parseFloat(editProduct.rating_seed_avg || '0');
          const cnt = 1; // Default count
          if (!isNaN(avg)) {
            seedSum = String(avg * cnt);
          }
        }
        if (seedSum) formData.append("rating_seed_sum", seedSum);

        // Debug: log what we're sending
        console.log("Sending product update:", {
          weight_grams: editProduct.weight_grams,
          weight_tolerance_grams: editProduct.weight_tolerance_grams,
          sales_seed_offset: editProduct.sales_seed_offset,
          rating_seed_sum: seedSum,
          rating_seed_avg: editProduct.rating_seed_avg
        });

        const res = await fetch(`${ADMIN_API_BASE_URL}/admin/products/${editingProduct.id}`, {
          method: "PUT",
          body: formData,
          credentials: API_INIT.credentials,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
        }

        setShowEditModal(false);
        setEditingProduct(null);
                 setEditProduct({
           name: "",
           category_id: "",
           original_price: "",
           product_cost: "",
           solo_price: "",
           friend_1_price: "",
           friend_2_price: "",
           friend_3_price: "0",
           weight_grams: "",
           weight_tolerance_grams: "",
           sales_seed_offset: "",
           rating_seed_sum: "",
           rating_seed_avg: "",
           image_url: "",
           extra_image_urls: "",
           home_position: "",
           landing_position: "",
         });
        setEditMainImage(null);
        setEditImages(null);
        setReload(r => r + 1);
        alert("محصول با موفقیت ویرایش شد.");
      } catch (err) {
        console.error("Edit error:", err);
        alert("خطا در ویرایش محصول: " + (err as Error).message);
      } finally {
        setEditing(false);
      }
    };
  
    /* --- add product */
     const handleAddProduct = async () => {
       // basic validation to avoid silent 4xx/5xx
       if (!newProduct.name.trim()) {
         alert("نام محصول را وارد کنید.");
         return;
       }
       if (!newProduct.category_id) {
         alert("دسته‌بندی را انتخاب کنید.");
         return;
       }
   
       try {
         setAdding(true);
         const fd = new FormData();
         fd.append("name", newProduct.name.trim());
   
         // Add new price fields
          // Original price maps to market_price
          fd.append("market_price", String(Number(newProduct.original_price || 0)));
         fd.append("product_cost", String(Number(newProduct.product_cost || 0)));
         fd.append("solo_price", String(Number(newProduct.solo_price || 0)));
         fd.append("friend_1_price", String(Number(newProduct.friend_1_price || 0)));
         fd.append("friend_2_price", String(Number(newProduct.friend_2_price || 0)));
         fd.append("friend_3_price", "0");  // Always zero for 3 friends
          if (newProduct.weight_grams) fd.append("weight_grams", newProduct.weight_grams);
          if (newProduct.weight_tolerance_grams) fd.append("weight_tolerance_grams", newProduct.weight_tolerance_grams);
          if (newProduct.sales_seed_offset) fd.append("sales_seed_offset", newProduct.sales_seed_offset);
          // Rating seed: if average provided, compute sum = avg * count
          let nSeedSum = newProduct.rating_seed_sum;
          if (newProduct.rating_seed_avg) {
            const avg = parseFloat(newProduct.rating_seed_avg || '0');
            const cnt = 1; // Default count
            if (!isNaN(avg)) {
              nSeedSum = String(avg * cnt);
            }
          }
          if (nSeedSum) fd.append("rating_seed_sum", nSeedSum);
   
         // Debug: log what we're sending
         console.log("Sending new product:", {
           weight_grams: newProduct.weight_grams,
           weight_tolerance_grams: newProduct.weight_tolerance_grams,
           sales_seed_offset: newProduct.sales_seed_offset,
           rating_seed_sum: nSeedSum,
           rating_seed_avg: newProduct.rating_seed_avg
         });
   
         fd.append("category_id", newProduct.category_id);
        
        // Image handling: prioritize file uploads over URLs
        if (mainImage) {
          fd.append("main_image", mainImage);
          console.log("Sending main_image file:", mainImage.name);
        } else if (newProduct.image_url && newProduct.image_url.trim()) {
          fd.append('image_url', newProduct.image_url.trim());
          console.log("Sending image_url:", newProduct.image_url.trim());
        }
        
        if (images && images.length > 0) {
          Array.from(images).forEach((f) => fd.append("images", f));
          console.log("Sending extra images files:", images.length);
        } else if (newProduct.extra_image_urls && newProduct.extra_image_urls.trim()) {
          fd.append('extra_image_urls', newProduct.extra_image_urls.trim());
          console.log("Sending extra_image_urls:", newProduct.extra_image_urls.trim());
        }
   
         const res = await fetch(`${ADMIN_API_BASE_URL}/admin/products`, {
           method: "POST",
           body: fd,
           credentials: API_INIT.credentials, // keep cookie behavior
         });
         if (!res.ok) {
           const text = await res.text().catch(() => "");
           throw new Error(`${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
         }
   
         // Try to use returned object to update list immediately
         let created: any | null = null;
         try {
           created = await res.json();
         } catch {
           /* server may return empty body */
         }
   
         // reset form
         setShowAddModal(false);
         setNewProduct({
           name: "",
           category_id: "",
            original_price: "",
           product_cost: "",
           solo_price: "",
           friend_1_price: "",
           friend_2_price: "",
           friend_3_price: "0",
            weight_grams: "",
            weight_tolerance_grams: "",
            sales_seed_offset: "",
            rating_seed_sum: "",
            rating_seed_avg: "",
            image_url: "",
            extra_image_urls: "",
         });
         setMainImage(null);
         setImages(null);
   
         // If search was filtering out the new item, clear it so you can see the new product.
         if (search) setSearch("");
   
         if (created && typeof created === "object") {
           setProducts((prev) => [created, ...prev]);
         } else {
           setReload((n) => n + 1); // fallback reload
         }
       } catch (err) {
         console.error("Add product error:", err);
         alert("خطا در افزودن محصول");
       } finally {
         setAdding(false);
       }
     };
   
     /* --- JSX */
     return (
       <div className="bg-white rounded-lg shadow-md p-6">
         {/* search / add */}
         <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
           <input
             className="w-full md:w-1/3 px-4 py-2 border rounded-lg"
             placeholder="جستجو محصولات..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
           <button
             onClick={() => setShowAddModal(true)}
             className="bg-blue-600 text-white px-4 py-2 rounded-lg"
           >
             افزودن محصول
           </button>
         </div>
   
         {/* table / error */}
         {loading ? (
           <div className="text-center py-8">در حال بارگذاری...</div>
         ) : error ? (
           <div className="text-center py-8 text-red-600">
             خطا در دریافت محصولات: {error}
           </div>
         ) : (
           <div className="overflow-x-auto">
             <table className="min-w-full">
               <thead className="bg-gray-50">
                 <tr>
                   <th className="px-6 py-3">تصویر</th>
                   <th className="px-6 py-3">نام</th>
                   <th className="px-6 py-3">دسته‌بندی</th>
                    <th className="px-6 py-3">قیمت اصلی</th>
                   <th className="px-6 py-3">هزینه محصول</th>
                   <th className="px-6 py-3">خرید به تنهایی</th>
                   <th className="px-6 py-3">خرید با 1 دوست</th>
                  <th className="px-6 py-3">جایگاه خانه</th>
                  <th className="px-6 py-3">جایگاه landingM</th>
                   <th className="px-6 py-3">عملیات</th>
                 </tr>
               </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                  {products.filter(p => p.id).map((p) => (
                  <React.Fragment key={`product-${p.id}`}>
                  <tr key={`row-${p.id}`}>
                    <td className="px-6 py-4">
                      {p.images && p.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">{p.name}</td>
                    <td className="px-6 py-4">{p.category}</td>
                    <td className="px-6 py-4">{toFa(p.market_price || p.solo_price || 0)} تومان</td>
                    <td className="px-6 py-4">{toFa(p.product_cost || 0)} تومان</td>
                    <td className="px-6 py-4">{toFa(p.solo_price || 0)} تومان</td>
                      <td className="px-6 py-4">{toFa(p.friend_1_price || 0)} تومان</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          className="border rounded px-2 py-1 w-20"
                          value={(positionEdits[p.id]?.home ?? '').toString()}
                          onChange={(e)=> setPositionEdits(prev => ({...prev, [p.id]: {...(prev[p.id]||{landing:'', home:''}), home: e.target.value, dirty: true}}))}
                        />
                        <button
                          disabled={positionEdits[p.id]?.saving}
                          onClick={async ()=>{
                            try {
                              setPositionEdits(prev => ({...prev, [p.id]: {...(prev[p.id]||{landing:'', home:''}), saving: true}}));
                              const fd = new FormData();
                              fd.append('home_position', toEnDigits((positionEdits[p.id]?.home ?? '').toString()).trim());
                              const payload = { home_position: Number(toEnDigits((positionEdits[p.id]?.home ?? '').toString()).trim() || '0') };
                              const res = await fetch(`${ADMIN_API_BASE_URL}/admin/products/${p.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', ...(API_INIT.headers||{}) },
                                body: JSON.stringify(payload),
                                credentials: API_INIT.credentials,
                              });
                              if (!res.ok) { const t = await res.text().catch(()=> ''); throw new Error(`${res.status} ${res.statusText} ${t}`); }
                              // Optimistic local update
                              const newVal = Number(toEnDigits((positionEdits[p.id]?.home ?? '').toString()).trim() || '0');
                              setProducts(prev => prev.map(x => x.id === p.id ? { ...x, home_position: newVal } : x));
                              setPositionEdits(prev => ({...prev, [p.id]: {...(prev[p.id]||{landing:'', home:''}), home: String(newVal), saving: false, dirty: false}}));
                              setReload(r => r + 1);
                            } catch (e) {
                              console.error(e);
                              alert('خطا در ذخیره جایگاه خانه: ' + (e as Error).message);
                              setPositionEdits(prev => ({...prev, [p.id]: {...(prev[p.id]||{landing:'', home:''}), saving: false}}));
                            }
                          }}
                          className="bg-blue-600 text-white px-2 py-1 rounded"
                        >
                          ذخیره
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          className="border rounded px-2 py-1 w-20"
                          value={(positionEdits[p.id]?.landing ?? '').toString()}
                          onChange={(e)=> setPositionEdits(prev => ({...prev, [p.id]: {...(prev[p.id]||{landing:'', home:''}), landing: e.target.value, dirty: true}}))}
                        />
                        <button
                          disabled={positionEdits[p.id]?.saving}
                          onClick={async ()=>{
                            try {
                              setPositionEdits(prev => ({...prev, [p.id]: {...(prev[p.id]||{landing:'', home:''}), saving: true}}));
                              const fd = new FormData();
                              fd.append('landing_position', toEnDigits((positionEdits[p.id]?.landing ?? '').toString()).trim());
                              const payload = { landing_position: Number(toEnDigits((positionEdits[p.id]?.landing ?? '').toString()).trim() || '0') };
                              const res = await fetch(`${ADMIN_API_BASE_URL}/admin/products/${p.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', ...(API_INIT.headers||{}) },
                                body: JSON.stringify(payload),
                                credentials: API_INIT.credentials,
                              });
                              if (!res.ok) { const t = await res.text().catch(()=> ''); throw new Error(`${res.status} ${res.statusText} ${t}`); }
                              // Optimistic local update
                              const newVal = Number(toEnDigits((positionEdits[p.id]?.landing ?? '').toString()).trim() || '0');
                              setProducts(prev => prev.map(x => x.id === p.id ? { ...x, landing_position: newVal } : x));
                              setPositionEdits(prev => ({...prev, [p.id]: {...(prev[p.id]||{landing:'', home:''}), landing: String(newVal), saving: false, dirty: false}}));
                              setReload(r => r + 1);
                            } catch (e) {
                              console.error(e);
                              alert('خطا در ذخیره جایگاه landingM: ' + (e as Error).message);
                              setPositionEdits(prev => ({...prev, [p.id]: {...(prev[p.id]||{landing:'', home:''}), saving: false}}));
                            }
                          }}
                          className="bg-blue-600 text-white px-2 py-1 rounded"
                        >
                          ذخیره
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr key={`meta-${p.id}`}>
                    <td className="px-6 py-2 text-xs text-gray-500" colSpan={8}>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="font-medium">وزن:</span> {p.weight_grams ? `${Math.round((Number(p.weight_grams)||0)/1000)} کیلوگرم` : '—'} 
                          {p.weight_tolerance_grams ? (<span> ± {Number(p.weight_tolerance_grams)} گرم</span>) : null}
                        </div>
                        <div>
                          <span className="font-medium">تعداد فروش:</span> {toFa(p.display_sales ?? 0)}
                        </div>
                        <div>
                          <span className="font-medium">امتیاز:</span> {p.display_rating ?? 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => handleEditProduct(p)}
                        className="text-blue-600 hover:text-blue-900 ml-2"
                      >
                        ویرایش
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={!p.id}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                  </React.Fragment>
                ))}
                </tbody>
             </table>
           </div>
         )}
   
         {/* Add Product modal */}
         {showAddModal && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
             <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">افزودن محصول جدید</h2>
                 <button
                   onClick={() => setShowAddModal(false)}
                   className="text-gray-500 hover:text-gray-700"
                 >
                   <FaTimes size={24} />
                 </button>
               </div>
   
               <div className="grid gap-4">
                 <input
                   placeholder="نام محصول"
                   className="border rounded p-2"
                   value={newProduct.name}
                   onChange={(e) =>
                     setNewProduct({ ...newProduct, name: e.target.value })
                   }
                 />
                  <input
                    type="number"
                    placeholder="قیمت اصلی"
                    className="border rounded p-2"
                    value={newProduct.original_price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, original_price: e.target.value })
                    }
                  />
                 
                 {/* Price fields */}
                 <input
                   type="number"
                   placeholder="هزینه محصول"
                   className="border rounded p-2"
                   value={newProduct.product_cost}
                   onChange={(e) =>
                     setNewProduct({ ...newProduct, product_cost: e.target.value })
                   }
                 />
                 <input
                   type="number"
                   placeholder="خرید به تنهایی"
                   className="border rounded p-2"
                   value={newProduct.solo_price}
                   onChange={(e) =>
                     setNewProduct({ ...newProduct, solo_price: e.target.value })
                   }
                 />
                 <input
                   type="number"
                   placeholder="خرید با 1 دوست"
                   className="border rounded p-2"
                   value={newProduct.friend_1_price}
                   onChange={(e) =>
                     setNewProduct({ ...newProduct, friend_1_price: e.target.value })
                   }
                 />
                 <input
                   type="number"
                   placeholder="خرید با 2 دوست"
                   className="border rounded p-2"
                   value={newProduct.friend_2_price}
                   onChange={(e) =>
                     setNewProduct({ ...newProduct, friend_2_price: e.target.value })
                   }
                 />
                 <input
                   type="number"
                   placeholder="خرید با 3 دوست (همیشه رایگان)"
                   className="border rounded p-2 bg-gray-100"
                   value="0"
                   readOnly
                   disabled
                 />
                 
                 <select
                   className="border rounded p-2"
                   value={newProduct.category_id}
                   onChange={(e) =>
                     setNewProduct({ ...newProduct, category_id: e.target.value })
                   }
                 >
                   <option value="">انتخاب دسته‌بندی</option>
                   {categories.map((c) => (
                     <option key={c.id} value={c.id}>
                       {c.name}
                     </option>
                   ))}
                 </select>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files ? e.target.files[0] : null;
                    setMainImage(file);
                    // Clear image_url when file is selected
                    if (file) {
                      setNewProduct({ ...newProduct, image_url: "" });
                    }
                  }}
                />
                {/* or paste a URL for تصویر اصلی */}
                <input
                  type="text"
                  placeholder="لینک تصویر اصلی (در صورت عدم انتخاب فایل)"
                  className="border rounded p-2"
                  value={newProduct.image_url}
                  onChange={(e) => {
                    setNewProduct({ ...newProduct, image_url: e.target.value });
                    // Clear file when URL is entered
                    if (e.target.value.trim()) {
                      setMainImage(null);
                    }
                  }}
                />
                 <input
                   type="file"
                   multiple
                   accept="image/*"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : null;
                    setImages(files);
                    // Clear extra URLs when files are selected
                    if (files && files.length > 0) {
                      setNewProduct({ ...newProduct, extra_image_urls: "" });
                    }
                  }}
                 />
                {/* optional extra image URLs as CSV or JSON array */}
                <input
                  type="text"
                  placeholder="لینک‌های تصاویر اضافه (CSV یا JSON)"
                  className="border rounded p-2"
                  value={newProduct.extra_image_urls}
                  onChange={(e) => {
                    setNewProduct({ ...newProduct, extra_image_urls: e.target.value });
                    // Clear files when URLs are entered
                    if (e.target.value.trim()) {
                      setImages(null);
                    }
                  }}
                />
                {/* Previews and remove controls for new product images */}
                {(mainImage || newProduct.image_url) && (
                  <div className="mt-2">
                    <div className="text-sm mb-1">پیشنمایش تصویر اصلی</div>
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mainImage ? URL.createObjectURL(mainImage) : newProduct.image_url}
                        alt="main"
                        className="w-24 h-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        className="px-3 py-1 rounded bg-red-600 text-white"
                        onClick={() => { setMainImage(null); setNewProduct({ ...newProduct, image_url: "" }); }}
                      >
                        حذف تصویر اصلی
                      </button>
                    </div>
                  </div>
                )}
                {images && images.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm mb-1">پیش 0cنمایش تصاویر انتخاب 0cشده</div>
                    <div className="grid grid-cols-4 gap-2">
                      {images.map((f, idx) => (
                        <div key={`newimg-${idx}`} className="border rounded p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-24 object-cover rounded" />
                          <button
                            type="button"
                            className="mt-1 w-full text-xs px-2 py-1 rounded bg-red-600 text-white"
                            onClick={() => setImages(prev => prev ? prev.filter((_, i) => i !== idx) : prev)}
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Preview extra image URLs */}
                {(() => {
                  const parseExtra = (raw: string): string[] => {
                    try {
                      const p = JSON.parse(raw);
                      if (Array.isArray(p)) return p.map((x) => String(x)).filter(Boolean);
                    } catch {}
                    return String(raw || "")
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s);
                  };
                  const urls = parseExtra(newProduct.extra_image_urls);
                  if (urls.length === 0) return null;
                  return (
                    <div className="mt-3">
                      <div className="text-sm mb-1">پیش 0cنمایش لینک 0cهای تصاویر اضافه</div>
                      <div className="grid grid-cols-4 gap-2">
                        {urls.map((u, idx) => (
                          <div key={`urlimg-${idx}`} className="border rounded p-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt={`img-${idx}`} className="w-full h-24 object-cover rounded" />
                            <button
                              type="button"
                              className="mt-1 w-full text-xs px-2 py-1 rounded bg-red-600 text-white"
                              onClick={() => {
                                const next = urls.filter((_, i) => i !== idx);
                                // store back as CSV for simplicity
                                setNewProduct({ ...newProduct, extra_image_urls: next.join(',') });
                              }}
                            >
                              حذف
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                  {/* Weight with tolerance */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">وزن (گرم)</label>
                      <input 
                        type="number" 
                        placeholder="وزن (گرم)" 
                        className="border rounded p-2 w-full" 
                        value={newProduct.weight_grams} 
                        onChange={(e)=>setNewProduct({...newProduct, weight_grams: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">تلورانس وزن (گرم)</label>
                      <div className="flex items-center gap-2">
                        <span className="px-2">±</span>
                        <input 
                          type="number" 
                          placeholder="تلورانس (گرم)" 
                          className="border rounded p-2 w-full" 
                          value={newProduct.weight_tolerance_grams} 
                          onChange={(e)=>setNewProduct({...newProduct, weight_tolerance_grams: e.target.value})} 
                        />
                      </div>
                    </div>
                  </div>
                  {/* Seeds */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">تعداد فروش اولیه</label>
                      <input 
                        type="number" 
                        placeholder="تعداد فروش اولیه" 
                        className="border rounded p-2" 
                        value={newProduct.sales_seed_offset} 
                        onChange={(e)=>setNewProduct({...newProduct, sales_seed_offset: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">میانگین امتیاز اولیه</label>
                      <input 
                        type="number" 
                        step="0.1"
                        placeholder="مثلاً 4.1" 
                        className="border rounded p-2" 
                        value={newProduct.rating_seed_avg} 
                        onChange={(e)=>setNewProduct({...newProduct, rating_seed_avg: e.target.value})} 
                      />
                    </div>
                  </div>
               </div>
   
               <div className="mt-6 flex justify-end">
                 <button
                   onClick={() => setShowAddModal(false)}
                   className="bg-gray-500 text-white px-4 py-2 rounded ml-2"
                 >
                   انصراف
                 </button>
                 <button
                   disabled={adding}
                   onClick={handleAddProduct}
                   className="bg-blue-600 text-white px-4 py-2 rounded"
                 >
                                     {adding ? "در حال افزودن..." : "افزودن"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">ویرایش محصول</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">نام محصول</label>
                  <input
                    type="text"
                    value={editProduct.name}
                    onChange={(e) => setEditProduct({...editProduct, name: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="نام محصول را وارد کنید"
                  />
                </div>
                {/* (Positions handled below with editProduct state) */}
                {/* Weight and seeds */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">وزن (گرم)</label>
                    <input 
                      type="number" 
                      placeholder="وزن (گرم)" 
                      className="border rounded p-2 w-full" 
                      value={editProduct.weight_grams} 
                      onChange={(e)=>setEditProduct({...editProduct, weight_grams: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">تلورانس وزن (گرم)</label>
                    <div className="flex items-center gap-2">
                      <span className="px-2">±</span>
                      <input 
                        type="number" 
                        placeholder="تلورانس (گرم)" 
                        className="border rounded p-2 w-full" 
                        value={editProduct.weight_tolerance_grams} 
                        onChange={(e)=>setEditProduct({...editProduct, weight_tolerance_grams: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
                {/* Positions */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">جایگاه در خانه</label>
                    <input
                      type="number"
                      placeholder="مثلاً 1"
                      className="border rounded p-2 w-full"
                      value={editProduct.home_position}
                      onChange={(e)=>setEditProduct({...editProduct, home_position: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">جایگاه در landingM</label>
                    <input
                      type="number"
                      placeholder="مثلاً 1"
                      className="border rounded p-2 w-full"
                      value={editProduct.landing_position}
                      onChange={(e)=>setEditProduct({...editProduct, landing_position: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">تعداد فروش اولیه</label>
                    <input 
                      type="number" 
                      placeholder="تعداد فروش اولیه" 
                      className="border rounded p-2" 
                      value={editProduct.sales_seed_offset} 
                      onChange={(e)=>setEditProduct({...editProduct, sales_seed_offset: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">میانگین امتیاز اولیه</label>
                    <input 
                      type="number" 
                      step="0.1"
                      placeholder="مثلاً 4.1" 
                      className="border rounded p-2" 
                      value={editProduct.rating_seed_avg} 
                      onChange={(e)=>setEditProduct({...editProduct, rating_seed_avg: e.target.value})} 
                    />
                  </div>
                </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">قیمت اصلی</label>
                   <input
                     type="number"
                     value={editProduct.original_price}
                     onChange={(e) => setEditProduct({...editProduct, original_price: e.target.value})}
                     className="w-full border rounded px-3 py-2"
                     placeholder="قیمت اصلی"
                   />
                 </div>
                {/* Price fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">هزینه محصول</label>
                    <input
                      type="number"
                      value={editProduct.product_cost}
                      onChange={(e) => setEditProduct({...editProduct, product_cost: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="هزینه محصول"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">خرید به تنهایی</label>
                    <input
                      type="number"
                      value={editProduct.solo_price}
                      onChange={(e) => setEditProduct({...editProduct, solo_price: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="خرید به تنهایی"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">خرید با 1 دوست</label>
                    <input
                      type="number"
                      value={editProduct.friend_1_price}
                      onChange={(e) => setEditProduct({...editProduct, friend_1_price: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="خرید با 1 دوست"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">خرید با 2 دوست</label>
                    <input
                      type="number"
                      value={editProduct.friend_2_price}
                      onChange={(e) => setEditProduct({...editProduct, friend_2_price: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="خرید با 2 دوست"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">خرید با 3 دوست (همیشه رایگان)</label>
                    <input
                      type="number"
                      value="0"
                      className="w-full border rounded px-3 py-2 bg-gray-100"
                      placeholder="خرید با 3 دوست (همیشه رایگان)"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">دسته‌بندی</label>
                    <select
                      value={editProduct.category_id}
                      onChange={(e) => setEditProduct({...editProduct, category_id: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">انتخاب دسته‌بندی</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">تصویر اصلی (اختیاری)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files ? e.target.files[0] : null;
                        setEditMainImage(file);
                        // Clear image_url when file is selected
                        if (file) {
                          setEditProduct({ ...editProduct, image_url: "" });
                        }
                      }}
                      className="w-full border rounded px-3 py-2"
                    />
                  <input
                    type="text"
                    placeholder="لینک تصویر اصلی (در صورت عدم انتخاب فایل)"
                    className="w-full border rounded px-3 py-2 mt-2"
                    value={editProduct.image_url}
                    onChange={(e) => {
                      setEditProduct({ ...editProduct, image_url: e.target.value });
                      // Clear file when URL is entered
                      if (e.target.value.trim()) {
                        setEditMainImage(null);
                      }
                    }}
                  />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">تصاویر اضافه (اختیاری)</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = e.target.files;
                        setEditImages(files);
                        // Clear extra URLs when files are selected
                        if (files && files.length > 0) {
                          setEditProduct({ ...editProduct, extra_image_urls: "" });
                        }
                      }}
                      className="w-full border rounded px-3 py-2"
                    />
                  <input
                    type="text"
                    placeholder="لینک‌های تصاویر اضافه (CSV یا JSON)"
                    className="w-full border rounded px-3 py-2 mt-2"
                    value={editProduct.extra_image_urls}
                    onChange={(e) => {
                      setEditProduct({ ...editProduct, extra_image_urls: e.target.value });
                      // Clear files when URLs are entered
                      if (e.target.value.trim()) {
                        setEditImages(null);
                      }
                    }}
                  />
                  </div>
                </div>

                {/* Selected new images preview (not yet saved) */}
                {editImages && editImages.length > 0 ? (
                  <div className="mt-3">
                    <div className="text-sm mb-1">پیشنمایش تصاویر انتخابشده (پس از ذخیره اعمال میشود)</div>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from(editImages).map((f, idx) => (
                        <div key={`preview-${idx}`} className="border rounded p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-24 object-cover rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Existing images with controls */}
                <div className="mt-6">
                  <div className="font-medium mb-2">تصاویر فعلی محصول</div>
                  {editImagesList.length === 0 ? (
                    <div className="text-sm text-gray-500">تصویری ثبت نشده است</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {editImagesList.map((img) => (
                        <div key={img.id} className={`border rounded p-2 ${img.is_main ? 'ring-2 ring-blue-500' : ''}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.image_url} alt="image" className="w-full h-24 object-cover rounded" />
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <button
                              className={`text-xs px-2 py-1 rounded ${img.is_main ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                              disabled={img.is_main}
                              onClick={() => handleSetMainImage(img.id)}
                            >
                              {img.is_main ? 'اصلی' : 'تعیین به cعنوان اصلی'}
                            </button>
                            <button
                              className="text-xs px-2 py-1 rounded bg-red-600 text-white"
                              disabled={!!deletingImageIds[img.id]}
                              onClick={() => handleDeleteImage(img.id)}
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick add image inline */}
                <div className="mt-4 p-3 border rounded">
                  <div className="text-sm font-medium mb-2">افزودن تصویر فوری</div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAddImageFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full border rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="یا لینک تصویر"
                      value={addImageUrl}
                      onChange={(e) => setAddImageUrl(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  
                  {/* Preview of image to be added */}
                  {(addImageFile || addImageUrl.trim()) && (
                    <div className="mt-3 p-2 border rounded bg-gray-50">
                      <div className="text-xs font-medium mb-2">پیش‌نمایش تصویر</div>
                      <div className="flex items-start gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={addImageFile ? URL.createObjectURL(addImageFile) : addImageUrl}
                          alt="preview"
                          className="w-32 h-32 object-cover rounded border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="flex-1 flex flex-col gap-2">
                          <div className="text-xs text-gray-600">
                            {addImageFile ? `فایل: ${addImageFile.name}` : `لینک: ${addImageUrl}`}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAddImageFile(null);
                              setAddImageUrl("");
                            }}
                            className="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 w-fit"
                          >
                            حذف پیش‌نمایش
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleAddImage}
                      disabled={addingImage || (!addImageFile && !addImageUrl.trim())}
                      className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50"
                    >
                      {addingImage ? 'در حال افزودن...' : 'افزودن تصویر'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded ml-2"
                >
                  انصراف
                </button>
                <button
                  disabled={editing}
                  onClick={handleUpdateProduct}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  {editing ? "در حال ویرایش..." : "ویرایش"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  /* --------------------------------------------------------------------------
     Categories (now includes "Add Category" modal)
      -------------------------------------------------------------------------- */
   
   function CategoriesContent() {
     const [categories, setCategories] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
   
         const [showAdd, setShowAdd] = useState(false);
    const [showEditCat, setShowEditCat] = useState(false);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [newCat, setNewCat] = useState({ name: "", slug: "", image_url: "", image_file: null as File | null });
    const [editCat, setEditCat] = useState({ name: "", slug: "", image_url: "", image_file: null as File | null });
   
     const load = useCallback(
       (signal?: AbortSignal) =>
         fetchJSON<any[]>(
           `${ADMIN_API_BASE_URL}/admin/categories`,
           undefined,
           signal
         ).then((data) => setCategories(data)),
       []
     );
   
     useEffect(() => {
       const ctrl = new AbortController();
       let alive = true;
   
       (async () => {
         try {
           setLoading(true);
           setError(null);
           await load(ctrl.signal);
         } catch (err: any) {
           if (!isAbort(err)) {
             console.error("Categories error:", err);
             if (alive) setError(err?.message ?? "خطای ناشناخته");
           }
         } finally {
           if (alive) setLoading(false);
         }
       })();
   
       return () => {
         alive = false;
         ctrl.abort();
       };
     }, [load]);
   
     const handleAddCategory = async () => {
       if (!newCat.name.trim()) {
         alert("نام دسته را وارد کنید.");
         return;
       }
       try {
         setAdding(true);
         let res: Response;
         if (newCat.image_file) {
           const form = new FormData();
           form.append("name", newCat.name.trim());
           if (newCat.slug.trim()) form.append("slug", newCat.slug.trim());
           form.append("image", newCat.image_file);
           res = await fetch(`${ADMIN_API_BASE_URL}/admin/categories`, { method: "POST", body: form, credentials: API_INIT.credentials });
         } else {
           const payload: any = { name: newCat.name.trim() };
           if (newCat.slug.trim()) payload.slug = newCat.slug.trim();
           if (newCat.image_url.trim()) payload.image_url = newCat.image_url.trim();
           res = await fetch(`${ADMIN_API_BASE_URL}/admin/categories`, {
             method: "POST",
             headers: { "Content-Type": "application/json", ...(API_INIT.headers as any) },
             credentials: API_INIT.credentials,
             body: JSON.stringify(payload),
           });
         }
         if (!res.ok) {
           const text = await res.text().catch(() => "");
           throw new Error(`${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
         }
   
         let created: any | null = null;
         try {
           created = await res.json();
         } catch {
           /* ignore if empty */
         }
   
         setShowAdd(false);
         setNewCat({ name: "", slug: "", image_url: "", image_file: null });
   
         if (created && typeof created === "object") {
           setCategories((prev) => [created, ...prev]);
         } else {
           await load(); // fallback reload
         }
       } catch (err) {
         console.error("Add category error:", err);
         alert("خطا در افزودن دسته‌بندی");
       } finally {
         setAdding(false);
             }
    };

    const handleEditCategory = (category: any) => {
      setEditingCategory(category);
      setEditCat({
        name: category.name || "",
        slug: category.slug || "",
        image_url: category.image_url || "",
        image_file: null,
      });
      setShowEditCat(true);
    };

    const handleUpdateCategory = async () => {
      if (!editCat.name.trim()) {
        alert("نام دسته را وارد کنید.");
        return;
      }
      try {
        setEditing(true);
        let res: Response;
        if (editCat.image_file || editCat.image_url.trim()) {
          const formData = new FormData();
          formData.append("name", editCat.name.trim());
          if (editCat.slug.trim()) formData.append("slug", editCat.slug.trim());
          if (editCat.image_file) formData.append("image", editCat.image_file);
          if (!editCat.image_file && editCat.image_url.trim()) formData.append("image_url", editCat.image_url.trim());
          res = await fetch(`${ADMIN_API_BASE_URL}/admin/categories/${editingCategory.id}`, { method: "PUT", body: formData, credentials: API_INIT.credentials });
        } else {
          // No image change; send minimal JSON
          res = await fetch(`${ADMIN_API_BASE_URL}/admin/categories/${editingCategory.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...(API_INIT.headers as any) },
            credentials: API_INIT.credentials,
            body: JSON.stringify({ name: editCat.name.trim(), ...(editCat.slug.trim() ? { slug: editCat.slug.trim() } : {}) }),
          });
        }

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
        }

        setShowEditCat(false);
        setEditingCategory(null);
        setEditCat({ name: "", slug: "", image_url: "", image_file: null });
        await load(); // Reload categories
        alert("دسته‌بندی با موفقیت ویرایش شد.");
      } catch (err) {
        console.error("Edit category error:", err);
        alert("خطا در ویرایش دسته‌بندی: " + (err as Error).message);
      } finally {
        setEditing(false);
      }
    };

    const handleDeleteCategory = async (id: number) => {
      if (!confirm("آیا از حذف این دسته‌بندی اطمینان دارید؟")) return;
      try {
        const res = await fetch(`${ADMIN_API_BASE_URL}/admin/categories/${id}`, {
          method: "DELETE",
          ...API_INIT,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
        }
        setCategories((prev) => prev.filter((c) => c.id !== id));
        alert("دسته‌بندی با موفقیت حذف شد.");
      } catch (err) {
        console.error("Delete category error:", err);
        alert("خطا در حذف دسته‌بندی: " + (err as Error).message);
      }
    };
  
    return (
       <div className="bg-white rounded-lg shadow-md p-6">
         <div className="mb-6 flex items-center justify-between">
           <h2 className="text-xl font-semibold">دسته‌بندی‌ها</h2>
           <button
             onClick={() => setShowAdd(true)}
             className="bg-blue-600 text-white px-4 py-2 rounded"
           >
             افزودن دسته
           </button>
         </div>
   
         {loading ? (
           <div className="text-center py-8">در حال بارگذاری...</div>
         ) : error ? (
           <div className="text-center py-8 text-red-600">
             خطا در دریافت دسته‌بندی‌ها: {error}
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {categories.map((cat) => (
              <div key={cat.id} className="border rounded-lg p-4">
                <h3 className="font-semibold">{cat.name}</h3>
                <p className="text-sm text-gray-600">{cat.slug}</p>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => handleEditCategory(cat)}
                    className="text-blue-600 hover:text-blue-900 text-sm ml-2"
                  >
                    ویرایش
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
           </div>
         )}
   
         {/* Add Category modal */}
         {showAdd && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
             <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-bold">افزودن دسته‌بندی</h2>
                 <button
                   onClick={() => setShowAdd(false)}
                   className="text-gray-500 hover:text-gray-700"
                 >
                   <FaTimes size={22} />
                 </button>
               </div>
   
                <div className="grid gap-3">
                 <input
                   placeholder="نام دسته"
                   className="border rounded p-2"
                   value={newCat.name}
                   onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                 />
                 <input
                   placeholder="نامک (اختیاری)"
                   className="border rounded p-2"
                   value={newCat.slug}
                   onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                 />
                  <input
                    placeholder="آدرس تصویر (اختیاری)"
                    className="border rounded p-2"
                    value={newCat.image_url}
                    onChange={(e) => setNewCat({ ...newCat, image_url: e.target.value, image_file: null })}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="border rounded p-2"
                    onChange={(e) => setNewCat({ ...newCat, image_file: e.target.files?.[0] || null, image_url: "" })}
                  />
                  {(newCat.image_file || newCat.image_url) && (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={newCat.image_file ? URL.createObjectURL(newCat.image_file) : newCat.image_url}
                        alt="preview"
                        className="w-full h-32 object-cover rounded"
                      />
                    </div>
                  )}
               </div>
   
               <div className="mt-5 flex justify-end">
                 <button
                   onClick={() => setShowAdd(false)}
                   className="bg-gray-500 text-white px-4 py-2 rounded ml-2"
                 >
                   انصراف
                 </button>
                 <button
                   disabled={adding}
                   onClick={handleAddCategory}
                   className="bg-blue-600 text-white px-4 py-2 rounded"
                 >
                   {adding ? "در حال افزودن..." : "افزودن"}
                 </button>
               </div>
             </div>
           </div>
                 )}

        {/* Edit Category modal */}
        {showEditCat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">ویرایش دسته‌بندی</h2>
                <button
                  onClick={() => setShowEditCat(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">نام دسته‌بندی</label>
                  <input
                    type="text"
                    value={editCat.name}
                    onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="نام دسته‌بندی"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">اسلاگ (اختیاری)</label>
                  <input
                    type="text"
                    value={editCat.slug}
                    onChange={(e) => setEditCat({ ...editCat, slug: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="اسلاگ (به صورت خودکار تولید می‌شود)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">آدرس تصویر (اختیاری)</label>
                  <input
                    type="text"
                    value={editCat.image_url}
                    onChange={(e) => setEditCat({ ...editCat, image_url: e.target.value, image_file: null })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">آپلود تصویر (اختیاری)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditCat({ ...editCat, image_file: e.target.files?.[0] || null, image_url: "" })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                {(editCat.image_file || editCat.image_url || editingCategory?.image_url) && (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editCat.image_file ? URL.createObjectURL(editCat.image_file) : (editCat.image_url || editingCategory?.image_url)}
                      alt="preview"
                      className="w-full h-32 object-cover rounded"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowEditCat(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded ml-2"
                >
                  انصراف
                </button>
                <button
                  disabled={editing}
                  onClick={handleUpdateCategory}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  {editing ? "در حال ویرایش..." : "ویرایش"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     Settings - Dynamic Category Image Management (v2)
     -------------------------------------------------------------------------- */

  // Color palette for category cards (dynamic)
  const CATEGORY_COLORS = [
    { border: "border-blue-400", title: "text-blue-700", bg: "bg-blue-50" },
    { border: "border-green-400", title: "text-green-700", bg: "bg-green-50" },
    { border: "border-orange-400", title: "text-orange-700", bg: "bg-orange-50" },
    { border: "border-purple-400", title: "text-purple-700", bg: "bg-purple-50" },
    { border: "border-pink-400", title: "text-pink-700", bg: "bg-pink-50" },
    { border: "border-teal-400", title: "text-teal-700", bg: "bg-teal-50" },
    { border: "border-indigo-400", title: "text-indigo-700", bg: "bg-indigo-50" },
    { border: "border-red-400", title: "text-red-700", bg: "bg-red-50" },
  ];

  function SettingsContent() {
    // Dynamic categories state
    const [categories, setCategories] = useState<any[]>([]);
    // categoryImages: { [categoryId]: { imageUrl: string, file: File | null } }
    const [categoryImages, setCategoryImages] = useState<Record<number, { imageUrl: string; file: File | null }>>({});
    // "All" tab settings
    const [allLabel, setAllLabel] = useState<string>("همه");
    const [allImageUrl, setAllImageUrl] = useState<string>("");
    const [allFile, setAllFile] = useState<File | null>(null);
    // AI chatbot
    const [aiChatbotEnabled, setAiChatbotEnabled] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    const load = useCallback(async () => {
      setLoading(true);
      try {
        // Fetch categories
        const catRes = await fetch(`${ADMIN_API_BASE_URL}/admin/categories`, API_INIT);
        let cats: any[] = [];
        if (catRes.ok) {
          cats = await catRes.json();
          setCategories(Array.isArray(cats) ? cats : []);
        }

        // Fetch settings
        const settingsRes = await fetch(`${ADMIN_API_BASE_URL}/admin/settings`, API_INIT);
        if (settingsRes.ok) {
          const js = await settingsRes.json();
          setAllLabel(js?.all_category_label || "همه");
          setAllImageUrl(js?.all_category_image || "");
          setAiChatbotEnabled(js?.ai_chatbot_enabled === "true" || js?.ai_chatbot_enabled === true);
          
          // Initialize category images from settings (category_<id>_image keys)
          const newCatImages: Record<number, { imageUrl: string; file: File | null }> = {};
          for (const cat of cats) {
            const key = `category_${cat.id}_image`;
            newCatImages[cat.id] = {
              imageUrl: js?.[key] || cat.image_url || "",
              file: null,
            };
          }
          setCategoryImages(newCatImages);
        }
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => { load(); }, [load]);

    const updateCategoryImage = (catId: number, field: "imageUrl" | "file", value: string | File | null) => {
      setCategoryImages(prev => ({
        ...prev,
        [catId]: {
          ...prev[catId],
          [field]: value,
          // If setting file, clear imageUrl; if setting imageUrl, clear file
          ...(field === "file" && value ? { imageUrl: "" } : {}),
          ...(field === "imageUrl" && value ? { file: null } : {}),
        },
      }));
    };

    const handleSave = async () => {
      setSaving(true);
      try {
        // Check if any files need to be uploaded
        const hasFiles = allFile || Object.values(categoryImages).some(ci => ci.file);
        
        let res: Response;
        if (hasFiles) {
          const form = new FormData();
          form.append("all_category_label", allLabel);
          if (allFile) form.append("all_category_image_file", allFile);
          else if (allImageUrl) form.append("all_category_image", allImageUrl);
          form.append("ai_chatbot_enabled", aiChatbotEnabled.toString());
          
          // Add category images
          for (const cat of categories) {
            const ci = categoryImages[cat.id];
            if (ci?.file) {
              form.append(`category_${cat.id}_image_file`, ci.file);
            } else if (ci?.imageUrl) {
              form.append(`category_${cat.id}_image`, ci.imageUrl);
            }
          }
          
          res = await fetch(`${ADMIN_API_BASE_URL}/admin/settings`, { method: "PUT", body: form });
        } else {
          const payload: any = {
            all_category_label: allLabel,
            ai_chatbot_enabled: aiChatbotEnabled,
          };
          if (allImageUrl) payload.all_category_image = allImageUrl;
          
          // Add category images
          for (const cat of categories) {
            const ci = categoryImages[cat.id];
            if (ci?.imageUrl) {
              payload[`category_${cat.id}_image`] = ci.imageUrl;
            }
          }
          
          res = await fetch(`${ADMIN_API_BASE_URL}/admin/settings`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        
        if (!res.ok) throw new Error(`${res.status}`);
        
        // Reload to get fresh data
        await load();
        alert("تنظیمات ذخیره شد");
      } catch (e: any) {
        console.error("Save settings error:", e);
        alert("خطا در ذخیره تنظیمات");
      } finally {
        setSaving(false);
      }
    };

    const handleDeleteCategoryImage = async (catId: number) => {
      if (!confirm("آیا از حذف تصویر این دسته‌بندی اطمینان دارید؟")) return;
      
      try {
        // Send empty value to delete
        const res = await fetch(`${ADMIN_API_BASE_URL}/admin/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [`category_${catId}_image`]: "" }),
        });
        
        if (!res.ok) throw new Error(`${res.status}`);
        
        setCategoryImages(prev => ({
          ...prev,
          [catId]: { imageUrl: "", file: null },
        }));
        alert("تصویر دسته‌بندی حذف شد");
      } catch (e: any) {
        console.error("Delete category image error:", e);
        alert("خطا در حذف تصویر");
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">تنظیمات</h2>

        {loading ? (
          <div>در حال بارگذاری…</div>
        ) : (
          <div className="grid gap-6 max-w-4xl">
            {/* تنظیمات تب همه */}
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-400">
              <h3 className="text-lg font-semibold mb-3 text-blue-700">تب «همه»</h3>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm mb-1 font-medium">برچسب تب «همه»</label>
                  <input className="border rounded p-2 w-full" value={allLabel} onChange={(e) => setAllLabel(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1 font-medium">آدرس تصویر (اختیاری)</label>
                  <input className="border rounded p-2 w-full" placeholder="https://…" value={allImageUrl} onChange={(e) => { setAllImageUrl(e.target.value); setAllFile(null); }} />
                </div>
                <div>
                  <label className="block text-sm mb-1 font-medium">آپلود تصویر (اختیاری)</label>
                  <input type="file" accept="image/*" onChange={(e) => { setAllFile(e.target.files?.[0] || null); if (e.target.files?.[0]) setAllImageUrl(""); }} />
                </div>
                {(allFile || allImageUrl) && (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={allFile ? URL.createObjectURL(allFile) : allImageUrl} alt="preview" className="w-32 h-32 object-cover rounded-lg border-2 border-blue-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic category image settings */}
            {categories.map((cat, index) => {
              const colorScheme = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
              const ci = categoryImages[cat.id] || { imageUrl: "", file: null };
              
              return (
                <div key={cat.id} className={`border rounded-lg p-4 ${colorScheme.bg} ${colorScheme.border}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className={`text-lg font-semibold ${colorScheme.title}`}>
                      دسته‌بندی «{cat.name}»
                    </h3>
                    {(ci.imageUrl || ci.file) && (
                      <button
                        onClick={() => handleDeleteCategoryImage(cat.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        حذف تصویر
                      </button>
                    )}
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm mb-1 font-medium">آدرس تصویر (اختیاری)</label>
                      <input
                        className="border rounded p-2 w-full"
                        placeholder="https://…"
                        value={ci.imageUrl}
                        onChange={(e) => updateCategoryImage(cat.id, "imageUrl", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 font-medium">آپلود تصویر (اختیاری)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => updateCategoryImage(cat.id, "file", e.target.files?.[0] || null)}
                      />
                    </div>
                    {(ci.file || ci.imageUrl) && (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ci.file ? URL.createObjectURL(ci.file) : ci.imageUrl}
                          alt="preview"
                          className={`w-32 h-32 object-cover rounded-lg border-2 ${colorScheme.border}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {categories.length === 0 && (
              <div className="text-center py-8 text-gray-500 border rounded-lg">
                هیچ دسته‌بندی‌ای وجود ندارد. ابتدا از بخش «دسته‌بندی‌ها» دسته‌بندی اضافه کنید.
              </div>
            )}

            {/* تنظیمات چت‌بات */}
            <div className="border-t pt-4 mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiChatbotEnabled}
                  onChange={(e) => setAiChatbotEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">
                  فعال‌سازی چت‌بات هوش مصنوعی
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 mr-7">
                چت‌بات هوش مصنوعی به طور خودکار به پیام‌های کاربران پاسخ می‌دهد
              </p>
            </div>

            {/* دکمه‌های ذخیره و بازنشانی */}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-6 py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">{saving ? "در حال ذخیره…" : "ذخیره تمام تنظیمات"}</button>
              <button onClick={load} className="bg-gray-500 text-white px-6 py-3 rounded font-semibold hover:bg-gray-600">بازنشانی</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     Banners
     -------------------------------------------------------------------------- */

  function BannersContent() {
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editingBanner, setEditingBanner] = useState<any | null>(null);
    const [newBan, setNewBan] = useState({ title: "", description: "", sort_order: 0, is_active: true, image_file: null as File | null, image_url: "" });
    const [editBan, setEditBan] = useState({ title: "", description: "", sort_order: 0, is_active: true, image_file: null as File | null, image_url: "" });

    const load = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${ADMIN_API_BASE_URL}/admin/banners`, API_INIT);
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        setBanners(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e?.message ?? "خطا");
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
      try {
        setAdding(true);
        const fd = new FormData();
        if (newBan.image_file) fd.append('image', newBan.image_file);
        if (!newBan.image_file && newBan.image_url) fd.append('image_url', newBan.image_url);
        fd.append('title', newBan.title);
        fd.append('description', newBan.description);
        fd.append('sort_order', String(newBan.sort_order || 0));
        fd.append('is_active', newBan.is_active ? 'true' : 'false');
        const res = await fetch(`${ADMIN_API_BASE_URL}/admin/banners`, { method: 'POST', body: fd, credentials: API_INIT.credentials });
        if (!res.ok) throw new Error(`${res.status}`);
        setShowAdd(false);
        setNewBan({ title: "", description: "", sort_order: 0, is_active: true, image_file: null, image_url: "" });
        await load();
      } catch (e: any) {
        alert('خطا در ایجاد بنر');
      } finally {
        setAdding(false);
      }
    };

    const handleEditOpen = (b: any) => {
      setEditingBanner(b);
      setEditBan({ title: b.title || '', description: b.description || '', sort_order: b.sort_order || 0, is_active: !!b.is_active, image_file: null, image_url: b.image_url || '' });
    };

    const handleUpdate = async () => {
      if (!editingBanner) return;
      try {
        setEditing(true);
        const fd = new FormData();
        if (editBan.image_file) fd.append('image', editBan.image_file);
        if (!editBan.image_file && editBan.image_url) fd.append('image_url', editBan.image_url);
        fd.append('title', editBan.title);
        fd.append('description', editBan.description);
        fd.append('sort_order', String(editBan.sort_order || 0));
        fd.append('is_active', editBan.is_active ? 'true' : 'false');
        const res = await fetch(`${ADMIN_API_BASE_URL}/admin/banners/${editingBanner.id}`, { method: 'PUT', body: fd, credentials: API_INIT.credentials });
        if (!res.ok) throw new Error(`${res.status}`);
        setEditingBanner(null);
        await load();
      } catch (e: any) {
        alert('خطا در ویرایش بنر');
      } finally {
        setEditing(false);
      }
    };

    const handleDelete = async (id: number) => {
      if (!confirm('حذف این بنر؟')) return;
      try {
        const res = await fetch(`${ADMIN_API_BASE_URL}/admin/banners/${id}`, { method: 'DELETE', credentials: API_INIT.credentials });
        if (!res.ok) throw new Error(`${res.status}`);
        setBanners(prev => prev.filter(b => b.id !== id));
      } catch (e: any) {
        alert('خطا در حذف بنر');
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">بنرها</h2>
          <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded">افزودن بنر</button>
        </div>

        {loading ? (
          <div className="text-center py-8">در حال بارگذاری...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">خطا: {error}</div>
        ) : banners.length === 0 ? (
          <div className="text-center py-8 text-gray-500">بنری موجود نیست</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((b) => (
              <div key={b.id} className="border rounded-lg p-3">
                <div className="relative w-full h-40 bg-gray-100 rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image_url} alt={b.title || ''} className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="mt-2 font-semibold truncate">{b.title || '—'}</div>
                <div className="text-sm text-gray-600 line-clamp-2">{b.description || ''}</div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">ترتیب: {b.sort_order}</span>
                  <div className="space-x-2">
                    <button onClick={() => handleEditOpen(b)} className="text-blue-600 hover:text-blue-900 ml-2">ویرایش</button>
                    <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:text-red-900">حذف</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAdd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">افزودن بنر</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-gray-700"><FaTimes size={22} /></button>
              </div>
              <div className="grid gap-3">
                <input placeholder="عنوان (اختیاری)" className="border rounded p-2" value={newBan.title} onChange={e => setNewBan({ ...newBan, title: e.target.value })} />
                <textarea placeholder="توضیحات (اختیاری)" className="border rounded p-2" value={newBan.description} onChange={e => setNewBan({ ...newBan, description: e.target.value })} />
                <input type="number" placeholder="ترتیب نمایش" className="border rounded p-2" value={newBan.sort_order} onChange={e => setNewBan({ ...newBan, sort_order: Number(e.target.value || 0) })} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newBan.is_active} onChange={e => setNewBan({ ...newBan, is_active: e.target.checked })} /> فعال
                </label>
                <div className="grid gap-2">
                  <input type="file" accept="image/*" onChange={e => setNewBan({ ...newBan, image_file: e.target.files ? e.target.files[0] : null })} />
                  <div className="text-center text-sm text-gray-500">یا</div>
                  <input placeholder="آدرس تصویر (URL)" className="border rounded p-2" value={newBan.image_url} onChange={e => setNewBan({ ...newBan, image_url: e.target.value })} />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button onClick={() => setShowAdd(false)} className="bg-gray-500 text-white px-4 py-2 rounded ml-2">انصراف</button>
                <button disabled={adding} onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded">{adding ? 'در حال افزودن...' : 'افزودن'}</button>
              </div>
            </div>
          </div>
        )}

        {editingBanner && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">ویرایش بنر</h2>
                <button onClick={() => setEditingBanner(null)} className="text-gray-500 hover:text-gray-700"><FaTimes size={22} /></button>
              </div>
              <div className="grid gap-3">
                <input placeholder="عنوان (اختیاری)" className="border rounded p-2" value={editBan.title} onChange={e => setEditBan({ ...editBan, title: e.target.value })} />
                <textarea placeholder="توضیحات (اختیاری)" className="border rounded p-2" value={editBan.description} onChange={e => setEditBan({ ...editBan, description: e.target.value })} />
                <input type="number" placeholder="ترتیب نمایش" className="border rounded p-2" value={editBan.sort_order} onChange={e => setEditBan({ ...editBan, sort_order: Number(e.target.value || 0) })} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editBan.is_active} onChange={e => setEditBan({ ...editBan, is_active: e.target.checked })} /> فعال
                </label>
                <div className="grid gap-2">
                  <input type="file" accept="image/*" onChange={e => setEditBan({ ...editBan, image_file: e.target.files ? e.target.files[0] : null })} />
                  <div className="text-center text-sm text-gray-500">یا</div>
                  <input placeholder="آدرس تصویر (URL)" className="border rounded p-2" value={editBan.image_url} onChange={e => setEditBan({ ...editBan, image_url: e.target.value })} />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button onClick={() => setEditingBanner(null)} className="bg-gray-500 text-white px-4 py-2 rounded ml-2">انصراف</button>
                <button disabled={editing} onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded">{editing ? 'در حال ویرایش...' : 'ویرایش'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  /* --------------------------------------------------------------------------
     Orders
      -------------------------------------------------------------------------- */
   
   function OrdersContent() {
     const [orders, setOrders] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
     const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
     const [loadingDetails, setLoadingDetails] = useState(false);
     const [detailsError, setDetailsError] = useState<string | null>(null);
     const [showDetailsModal, setShowDetailsModal] = useState(false);
   
     useEffect(() => {
       const ctrl = new AbortController();
       let alive = true;
   
       (async () => {
         try {
           setLoading(true);
           setError(null);
          const data = await fetchJSON<any[]>(
            `${ADMIN_API_BASE_URL}/admin/orders?limit=1000`,
            undefined,
            ctrl.signal
          );
           if (!alive) return;
           setOrders(data);
         } catch (err: any) {
           if (!isAbort(err)) {
             console.error("Orders error:", err);
             if (alive) setError(err?.message ?? "خطای ناشناخته");
           }
         } finally {
           if (alive) setLoading(false);
         }
       })();
   
       return () => {
         alive = false;
         ctrl.abort();
       };
     }, []);
   
     const fetchDetails = async (id: number) => {
       setLoadingDetails(true);
       setDetailsError(null);
       try {
         const data = await fetchJSON<OrderDetail>(
           `${ADMIN_API_BASE_URL}/admin/orders/${id}`
         );
         setSelectedOrder(data);
         setShowDetailsModal(true);
       } catch (err: any) {
         if (!isAbort(err)) {
           console.error("Order details error:", err);
           setDetailsError(err?.message ?? "خطای ناشناخته");
           setShowDetailsModal(true); // show modal to display error
         }
       } finally {
         setLoadingDetails(false);
       }
     };
   
     const updateStatus = async (id: number, status: string) => {
       try {
         const res = await fetch(`${ADMIN_API_BASE_URL}/admin/orders/${id}/status`, {
           method: "PUT",
           headers: { "Content-Type": "application/json", ...(API_INIT.headers as any) },
           body: JSON.stringify({ status }),
           credentials: API_INIT.credentials,
         });
         if (!res.ok) {
           const text = await res.text().catch(() => "");
           throw new Error(`${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
         }
         setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
         setSelectedOrder((cur) => (cur?.id === id ? { ...cur, status } : cur));
       } catch (err) {
         console.error("Update status error:", err);
         alert("خطا در به‌روزرسانی وضعیت");
       }
     };
   
     const color = (s: string) =>
       ({
         completed: "bg-green-100 text-green-800",
         processing: "bg-blue-100 text-blue-800",
         shipped: "bg-purple-100 text-purple-800",
         cancelled: "bg-red-100 text-red-800",
         pending: "bg-yellow-100 text-yellow-800",
         "تایید نشده": "bg-orange-100 text-orange-800",
       }[s] ?? "bg-gray-100 text-gray-800");
   
     const label = (s: string) =>
       ({
         pending: "در انتظار",
         processing: "در حال پردازش",
         shipped: "ارسال شده",
         completed: "تکمیل شده",
         cancelled: "لغو شده",
         "تایید نشده": "تایید نشده",
       }[s] ?? s);
   
     return (
       <>
         <div className="bg-white rounded-lg shadow-md p-6">
           <h2 className="text-xl font-semibold mb-6">سفارشات</h2>
           {loading ? (
             <div className="text-center py-8">در حال بارگذاری...</div>
           ) : error ? (
             <div className="text-center py-8 text-red-600">
               خطا در دریافت سفارشات: {error}
             </div>
           ) : (
             <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3">شماره</th>
                      <th className="px-6 py-3">کاربر</th>
                      <th className="px-6 py-3">مبلغ</th>
                      <th className="px-6 py-3">وضعیت</th>
                      <th className="px-6 py-3">تاریخ</th>
                      <th className="px-6 py-3">تحویل</th>
                      <th className="px-6 py-3">عملیات</th>
                    </tr>
                  </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {orders.map((o) => (
                     <tr key={o.id} className="hover:bg-gray-50">
                       <td className="px-6 py-4">
                         #{o.id}
                         {o.consolidated && (
                           <span className="mr-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                             گروهی ({o.consolidated_member_count + 1} نفر)
                           </span>
                         )}
                         {o.custom_address && (
                           <span className="mr-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                             آدرس شخصی
                           </span>
                         )}
                       </td>
                       <td className="px-6 py-4">
                         <div>{o.user_name}</div>
                         <div className="text-sm text-gray-500">{o.user_phone}</div>
                         {o.consolidated && (
                           <div className="text-xs text-blue-600 mt-1">سفارش گروهی ترکیب شده</div>
                         )}
                       </td>
                       <td className="px-6 py-4">{toFa(o.total_amount)} تومان</td>
                       <td className="px-6 py-4">
                         <span
                           className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${color(
                             o.status
                           )}`}
                         >
                           {label(o.status)}
                         </span>
                       </td>
                       <td className="px-6 py-4">
                         {toTehranDate(o.created_at)}
                       </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-[280px]">
                          {o.delivery_slot ? (
                            <div className="mb-1">{o.delivery_slot}</div>
                          ) : null}
                          {o.shipping_address ? (
                            <div className="truncate" title={o.shipping_address}>
                              {o.shipping_address}
                              {o.shipping_details ? (
                                <span className="text-gray-500"> — {o.shipping_details}</span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                       <td className="px-6 py-4">
                         <button
                           disabled={loadingDetails}
                           onClick={() => fetchDetails(o.id)}
                           className="text-blue-600 hover:text-blue-900 ml-3"
                           aria-label={`مشاهده سفارش #${o.id}`}
                           title="مشاهده جزئیات"
                         >
                           <FaEye />
                         </button>
                         <select
                           className="text-sm border rounded px-2 py-1"
                           value={o.status}
                           onChange={(e) => updateStatus(o.id, e.target.value)}
                         >
                           <option value="pending">در انتظار</option>
                           <option value="processing">در حال پردازش</option>
                           <option value="shipped">ارسال شده</option>
                           <option value="completed">تحویل داده شده</option>
                           <option value="cancelled">لغو شده</option>
                           <option value="pending_approval">در انتظار تایید</option>
                         </select>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
         </div>
   
         {showDetailsModal && (
           <OrderDetailsModal
             order={selectedOrder}
             error={detailsError}
             loading={loadingDetails}
             close={() => {
               setShowDetailsModal(false);
               setSelectedOrder(null);
               setDetailsError(null);
             }}
           />
         )}
      </>
    );
  }
  
  /* --------------------------------------------------------------------------
     Order details modal
     -------------------------------------------------------------------------- */
   
   function OrderDetailsModal({
     order,
     error,
     loading,
     close,
   }: {
     order: OrderDetail | null;
     error: string | null;
     loading: boolean;
     close: () => void;
   }) {
     const color = (s: string) =>
       ({
         completed: "bg-green-100 text-green-800",
         processing: "bg-blue-100 text-blue-800",
         shipped: "bg-purple-100 text-purple-800",
         cancelled: "bg-red-100 text-red-800",
         pending: "bg-yellow-100 text-yellow-800",
         "تایید نشده": "bg-orange-100 text-orange-800",
       }[s] ?? "bg-gray-100 text-gray-800");

     const label = (s: string) =>
       ({
         pending: "در انتظار",
         processing: "در حال پردازش",
         shipped: "ارسال شده",
         completed: "تحویل داده شده",
         cancelled: "لغو شده",
         "تایید نشده": "تایید نشده",
       }[s] ?? s);
   
     return (
       <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
         <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
           <div className="p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold">
                 {order ? `جزئیات سفارش #${order.id}` : "جزئیات سفارش"}
               </h2>
               <button onClick={close} className="text-gray-500 hover:text-gray-700">
                 <FaTimes size={24} />
               </button>
             </div>
   
             {loading ? (
               <div className="text-center py-8">در حال بارگذاری...</div>
             ) : error ? (
               <div className="text-center py-8 text-red-600">
                 خطا در دریافت جزئیات: {error}
               </div>
             ) : order ? (
               <>
                 <div className="grid md:grid-cols-2 gap-6 mb-6">
                   <div>
                     <h3 className="font-semibold mb-3">اطلاعات کاربر</h3>
                     <div className="bg-gray-50 p-4 rounded">
                       <p>
                         <strong>نام:</strong> {order.user_name}
                       </p>
                       <p>
                         <strong>تلفن:</strong> {order.user_phone}
                       </p>
                       {order.user_email && (
                         <p>
                           <strong>ایمیل:</strong> {order.user_email}
                         </p>
                       )}
                     </div>
                   </div>
                   <div>
                     <h3 className="font-semibold mb-3">اطلاعات سفارش</h3>
                     <div className="bg-gray-50 p-4 rounded">
                       <p>
                         <strong>وضعیت:</strong>{" "}
                         <span
                           className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${color(
                             order.status
                           )}`}
                         >
                           {label(order.status)}
                         </span>
                       </p>
                       <p>
                         <strong>تاریخ ثبت:</strong>{" "}
                         {toTehranDateTime(order.created_at)}
                       </p>
                       <p>
                         <strong>مبلغ کل:</strong> {toFa(order.total_amount)} تومان
                       </p>
                       {order.payment_method && (
                         <p>
                           <strong>روش پرداخت:</strong> {order.payment_method}
                         </p>
                       )}
                     </div>
                   </div>
                 </div>
   
                                 {(order.shipping_address || order.delivery_slot) && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3">اطلاعات ارسال</h3>
                    <div className="bg-gray-50 p-4 rounded">
                      {order.shipping_address && (
                        <p><strong>آدرس:</strong> {order.shipping_address}</p>
                      )}
                      {order.delivery_slot && (
                        <p><strong>زمان تحویل:</strong> {order.delivery_slot}</p>
                      )}
                    </div>
                  </div>
                )}
   
                 {order.consolidated && order.participants && order.participants.length > 0 ? (
                   <div className="space-y-6">
                     {order.participants.map((p, idx) => (
                       <div key={p.order_id} className="border rounded-md">
                         <div className="px-4 py-3 bg-gray-50 flex items-center justify-between rounded-t-md">
                           <div className="font-semibold">
                             سفارش عضو {idx === 0 ? '(لیدر)' : ''} — {p.user_name}
                           </div>
                           <div className="text-sm text-gray-600">مبلغ این سفارش: {toFa(p.total_amount)} تومان</div>
                         </div>
                         <div className="overflow-x-auto">
                           <table className="min-w-full">
                             <thead className="bg-gray-50">
                               <tr>
                                 <th className="px-6 py-3">محصول</th>
                                 <th className="px-6 py-3">تعداد</th>
                                 <th className="px-6 py-3">قیمت واحد</th>
                                 <th className="px-6 py-3">قیمت کل</th>
                               </tr>
                             </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                               {p.items.map((i) => (
                                 <tr key={i.id}>
                                   <td className="px-6 py-4">{i.product_name}</td>
                                   <td className="px-6 py-4">{i.quantity}</td>
                                   <td className="px-6 py-4">{toFa(i.base_price)} تومان</td>
                                   <td className="px-6 py-4">{toFa(i.total_price)} تومان</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>
                     ))}
                     <div className="text-right font-semibold">جمع کل گروه: {toFa(order.total_amount)} تومان</div>
                   </div>
                 ) : (
                   <>
                     <h3 className="font-semibold mb-3">اقلام سفارش ({order.items.length})</h3>
                     <div className="overflow-x-auto">
                       <table className="min-w-full">
                         <thead className="bg-gray-50">
                           <tr>
                             <th className="px-6 py-3">محصول</th>
                             <th className="px-6 py-3">تعداد</th>
                             <th className="px-6 py-3">قیمت واحد</th>
                             <th className="px-6 py-3">قیمت کل</th>
                           </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                           {order.items.map((i) => (
                             <tr key={i.id}>
                               <td className="px-6 py-4">{i.product_name}</td>
                               <td className="px-6 py-4">{i.quantity}</td>
                               <td className="px-6 py-4">{toFa(i.base_price)} تومان</td>
                               <td className="px-6 py-4">{toFa(i.total_price)} تومان</td>
                             </tr>
                           ))}
                         </tbody>
                         <tfoot className="bg-gray-50">
                           <tr>
                             <td colSpan={3} className="px-6 py-3 text-right font-semibold">جمع کل:</td>
                             <td className="px-6 py-3 font-semibold">{toFa(order.total_amount)} تومان</td>
                           </tr>
                         </tfoot>
                       </table>
                     </div>
                   </>
                 )}
               </>
             ) : (
               <div className="text-center py-8">اطلاعاتی برای نمایش نیست.</div>
             )}
   
             <div className="mt-6 flex justify-end">
               <button
                 onClick={close}
                 className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
               >
                 بستن
               </button>
             </div>
           </div>
         </div>
       </div>
     );
   }
   
   /* --------------------------------------------------------------------------
      Users
      -------------------------------------------------------------------------- */
   
   function UsersContent() {
     const [users, setUsers] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
     const [search, setSearch] = useState("");
    const [adjustUser, setAdjustUser] = useState<any | null>(null);
    const [adjustMode, setAdjustMode] = useState<'set' | 'delta'>('delta');
    const [adjustValue, setAdjustValue] = useState<string>("0");
   
     useEffect(() => {
       const ctrl = new AbortController();
       let alive = true;
   
       (async () => {
         try {
           setLoading(true);
           setError(null);
           const data = await fetchJSON<any[]>(
             `${ADMIN_API_BASE_URL}/admin/users${qs({ search })}`,
             undefined,
             ctrl.signal
           );
           if (!alive) return;
           setUsers(data);
         } catch (err: any) {
           if (!isAbort(err)) {
             console.error("Users error:", err);
             if (alive) setError(err?.message ?? "خطای ناشناخته");
           }
         } finally {
           if (alive) setLoading(false);
         }
       })();
   
       return () => {
         alive = false;
         ctrl.abort();
       };
     }, [search]);
   
     return (
       <div className="bg-white rounded-lg shadow-md p-6">
         <div className="mb-6">
           <input
             className="w-full md:w-1/3 px-4 py-2 border rounded-lg"
             placeholder="جستجو کاربران..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
         </div>
   
         {loading ? (
           <div className="text-center py-8">در حال بارگذاری...</div>
         ) : error ? (
           <div className="text-center py-8 text-red-600">
             خطا در دریافت کاربران: {error}
           </div>
         ) : (
           <div className="overflow-x-auto">
             <table className="min-w-full">
               <thead className="bg-gray-50">
                 <tr>
                   <th className="px-6 py-3">نام</th>
                   <th className="px-6 py-3">ایمیل</th>
                   <th className="px-6 py-3">تلفن</th>
                   <th className="px-6 py-3">روش ثبت‌نام</th>
                   <th className="px-6 py-3">نوع</th>
                   <th className="px-6 py-3">سکه‌ها</th>
                   <th className="px-6 py-3">تاریخ عضویت</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id}>
                     <td className="px-6 py-4">
                       {u.first_name} {u.last_name}
                     </td>
                     <td className="px-6 py-4">{u.email ?? "N/A"}</td>
                     <td className="px-6 py-4">{u.phone_number ?? "N/A"}</td>
                     <td className="px-6 py-4">
                       <span
                         className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                           u.registration_method === "phone"
                             ? "bg-blue-100 text-blue-800"
                             : u.registration_method === "telegram"
                             ? "bg-purple-100 text-purple-800"
                             : u.registration_method === "email"
                             ? "bg-green-100 text-green-800"
                             : "bg-gray-100 text-gray-800"
                         }`}
                       >
                         {u.registration_method === "phone"
                           ? "تلفن"
                           : u.registration_method === "telegram"
                           ? "تلگرام"
                           : u.registration_method === "email"
                           ? "ایمیل"
                           : "نامشخص"}
                       </span>
                     </td>
                     <td className="px-6 py-4">
                       <span
                         className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                           u.user_type === "MERCHANT"
                             ? "bg-purple-100 text-purple-800"
                             : "bg-blue-100 text-blue-800"
                         }`}
                       >
                         {u.user_type === "MERCHANT" ? "فروشنده" : "مشتری"}
                       </span>
                     </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span>{typeof u.coins === 'number' ? toFa(u.coins) : '-'}</span>
                        <button
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                          onClick={() => setAdjustUser(u)}
                        >تنظیم</button>
                      </div>
                    </td>
                     <td className="px-6 py-4">
                       {toTehranDate(u.created_at)}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         )}

        {adjustUser && (
          <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setAdjustUser(null)}>
            <div className="bg-white w-full max-w-md rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">تنظیم موجودی کیف پول</h3>
                <button onClick={() => setAdjustUser(null)}>×</button>
              </div>
              <div className="text-sm text-gray-600 mb-2">کاربر: {adjustUser.first_name} {adjustUser.last_name} — {adjustUser.phone_number}</div>
              <div className="text-sm mb-4">موجودی فعلی: <span className="font-bold">{typeof adjustUser.coins === 'number' ? toFa(adjustUser.coins) : '-'}</span> تومان</div>

              <div className="flex gap-2 mb-3">
                <button
                  className={`px-3 py-1 rounded ${adjustMode === 'delta' ? 'bg-pink-600 text-white' : 'bg-gray-100'}`}
                  onClick={() => setAdjustMode('delta')}
                >افزایش/کاهش (Δ)</button>
                <button
                  className={`px-3 py-1 rounded ${adjustMode === 'set' ? 'bg-pink-600 text-white' : 'bg-gray-100'}`}
                  onClick={() => setAdjustMode('set')}
                >تنظیم مقدار دقیق</button>
              </div>

              <div className="mb-4">
                <label className="block text-sm mb-1">{adjustMode === 'delta' ? 'مقدار تغییر (تومان)' : 'موجودی جدید (تومان)'}
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-right"
                  inputMode="numeric"
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value.replace(/[^0-9\-]/g, ''))}
                  placeholder={adjustMode === 'delta' ? 'مثلاً 5000 یا -3000' : 'مثلاً 120000'}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded bg-gray-100" onClick={() => setAdjustUser(null)}>انصراف</button>
                <button
                  className="px-4 py-2 rounded bg-pink-600 text-white"
                  onClick={async () => {
                    try {
                      const raw = parseInt(adjustValue || '0', 10);
                      if (Number.isNaN(raw)) return;
                      const body = adjustMode === 'delta'
                        ? { method: 'POST', url: `${ADMIN_API_BASE_URL}/admin/users/${adjustUser.id}/coins/adjust`, payload: { delta: raw } }
                        : { method: 'PUT', url: `${ADMIN_API_BASE_URL}/admin/users/${adjustUser.id}/coins`, payload: { coins: Math.max(0, raw) } };

                      const response = await fetchJSON<{ coins: number; user_id: number; message: string }>(body.url, {
                        method: body.method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body.payload),
                        credentials: (API_INIT as any).credentials,
                      } as RequestInit);

                      console.log('✅ Coins updated successfully:', response);

                      // Use the actual coins value from backend response
                      const newCoinsValue = response.coins;
                      setUsers(prev => prev.map(x => x.id === adjustUser.id ? { ...x, coins: newCoinsValue } : x));
                      setAdjustUser(null);
                      setAdjustValue('0');
                      alert('موجودی با موفقیت تغییر کرد');
                    } catch (err) {
                      console.error('Adjust coins error:', err);
                      alert('خطا در تنظیم موجودی: ' + (err as any)?.message || 'خطای ناشناخته');
                    }
                  }}
                >ثبت</button>
              </div>
            </div>
          </div>
        )}
       </div>
     );
   }
   
   /* --------------------------------------------------------------------------
      Group Buys
      -------------------------------------------------------------------------- */
   
  function GroupBuysContent() {
    const [groupBuys, setGroupBuys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<any | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Global error handler for this component
    React.useEffect(() => {
      const handleError = (event: ErrorEvent) => {
        console.error('GroupBuysContent unhandled error:', event.error);
        setError(event.error?.message || 'خطای ناشناخته رخ داد');
      };
      
      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, []);
   
     /* --- list */
     useEffect(() => {
       const ctrl = new AbortController();
       let alive = true;
   
       (async () => {
         try {
           setLoading(true);
           setError(null);
          // Add timestamp to prevent browser caching
          const timestamp = new Date().getTime();
          console.log('🔍 Fetching group buys from:', `${ADMIN_API_BASE_URL}/admin/group-buys?limit=1000&_t=${timestamp}`);
          const data = await fetchJSON<any[]>(
            `${ADMIN_API_BASE_URL}/admin/group-buys?limit=1000&_t=${timestamp}`,
            { cache: 'no-store' },
            ctrl.signal
          );
           if (!alive) return;
           setGroupBuys(Array.isArray(data) ? data : []);
        } catch (err: any) {
          if (!isAbort(err)) {
            console.error("Group buys error:", err);
            console.error("Error details:", {
              message: err?.message,
              status: err?.status,
              url: err?.url,
              body: err?.body
            });
            if (alive) {
              const errorMsg = err?.message || err?.toString() || "خطای ناشناخته";
              setError(errorMsg);
            }
          }
        } finally {
           if (alive) setLoading(false);
         }
       })();
   
       return () => {
         alive = false;
         ctrl.abort();
       };
     }, []);
   
     const fetchDetails = async (id: number) => {
       setLoadingDetails(true);
       setDetailsError(null);
       try {
         const data = await fetchJSON<any>(
           `${ADMIN_API_BASE_URL}/admin/group-buys/${id}`
         );
         setSelected(data);
         setShowModal(true);
       } catch (err: any) {
         if (!isAbort(err)) {
           console.error("Group-buy details error:", err);
           setDetailsError(err?.message ?? "خطای ناشناخته");
           setShowModal(true);
         }
       } finally {
         setLoadingDetails(false);
       }
     };
   
     const color = (s: string) =>
       ({
         completed: "bg-green-100 text-green-800",
         active: "bg-blue-100 text-blue-800",
         pending: "bg-yellow-100 text-yellow-800",
         expired: "bg-red-100 text-red-800",
         /* Persian mirrors */
         "تکمیل شده": "bg-green-100 text-green-800",
         فعال: "bg-blue-100 text-blue-800",
         "در انتظار": "bg-yellow-100 text-yellow-800",
         منقضی: "bg-red-100 text-red-800",
       }[s] ?? "bg-gray-100 text-gray-800");
   
     return (
       <>
         <div className="bg-white rounded-lg shadow-md p-6">
           <h2 className="text-xl font-semibold mb-6">خرید گروهی</h2>
           {loading ? (
             <div className="text-center py-8">در حال بارگذاری...</div>
           ) : error ? (
             <div className="text-center py-8 text-red-600">
               خطا در دریافت لیست خرید گروهی: {error}
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="min-w-full">
                  <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3">شماره</th>
                     <th className="px-6 py-3">محصول</th>
                     <th className="px-6 py-3">ایجادکننده</th>
                     <th className="px-6 py-3">کد دعوت</th>
                      <th className="px-6 py-3">پیگیری</th>
                     <th className="px-6 py-3">شرکت‌کنندگان</th>
                     <th className="px-6 py-3">وضعیت</th>
                     <th className="px-6 py-3">ایجاد</th>
                     <th className="px-6 py-3">انقضاء</th>
                     <th className="px-6 py-3">عملیات</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {groupBuys.map((g) => (
                     <tr key={g.id} className="hover:bg-gray-50">
                       <td className="px-6 py-4">#{g.id}</td>
                       <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                           <span>{g.product_name}</span>
                           {String(g?.kind || '').toLowerCase() === 'secondary' && (
                             <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">ثانویه</span>
                           )}
                         </div>
                       </td>
                       <td className="px-6 py-4">
                         {(() => {
                           const isTelegramUser = g.creator_phone && (g.creator_phone.startsWith('@') || g.creator_phone.startsWith('TG:'));
                           
                           if (isTelegramUser) {
                             // For Telegram users: show name first, username/ID second
                             return (
                               <>
                                 <div>{g.creator_name || "کاربر تلگرام"}</div>
                                 <div className="text-sm text-gray-500">{g.creator_phone}</div>
                               </>
                             );
                           } else {
                             // For phone users: show phone first, name second
                             return (
                               <>
                                 <div>{g.creator_phone || g.leader_username || "—"}</div>
                                 {g.creator_name && g.creator_name !== "کاربر ناشناس" && (
                                   <div className="text-sm text-gray-500">{g.creator_name}</div>
                                 )}
                               </>
                             );
                           }
                         })()}
                       </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const href = g.invite_link || (g.invite_code ? `/landingM?invite=${g.invite_code}` : "#");
                            const label = g.invite_link ? g.invite_link : g.invite_code;
                            return (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                <code className="bg-gray-100 px-2 py-1 rounded">{label}</code>
                              </a>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <a href={`/track/${g.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            مشاهده
                          </a>
                        </td>
                       <td className="px-6 py-4">{g.participants_count} نفر</td>
                       <td className="px-6 py-4">
                         <span
                           className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${color(
                             g.status
                           )}`}
                         >
                           {g.status}
                         </span>
                       </td>
                       <td className="px-6 py-4">
                         {toTehranDate(g.created_at)}
                       </td>
                       <td className="px-6 py-4">
                         {toTehranDate(g.expires_at)}
                       </td>
                       <td className="px-6 py-4">
                         <button
                           disabled={loadingDetails}
                           onClick={() => fetchDetails(g.id)}
                           className="text-blue-600 hover:text-blue-900"
                           aria-label={`مشاهده خرید گروهی #${g.id}`}
                           title="مشاهده جزئیات"
                         >
                           <FaEye />
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
         </div>
   
         {showModal && (
           <GroupBuyDetailsModal
             data={selected}
             loading={loadingDetails}
             error={detailsError}
             close={() => {
               setShowModal(false);
               setSelected(null);
               setDetailsError(null);
             }}
           />
         )}
       </>
     );
   }
   
   /* --------------------------------------------------------------------------
      GroupBuy details modal
      -------------------------------------------------------------------------- */
   
   function GroupBuyDetailsModal({
     data,
     loading,
     error,
     close,
   }: {
     data: any;
     loading: boolean;
     error: string | null;
     close: () => void;
   }) {
     const color = (s: string) =>
       ({
         completed: "bg-green-100 text-green-800",
         active: "bg-blue-100 text-blue-800",
         pending: "bg-yellow-100 text-yellow-800",
         expired: "bg-red-100 text-red-800",
         "تکمیل شده": "bg-green-100 text-green-800",
         فعال: "bg-blue-100 text-blue-800",
         "در انتظار": "bg-yellow-100 text-yellow-800",
         منقضی: "bg-red-100 text-red-800",
       }[s] ?? "bg-gray-100 text-gray-800");
   
     return (
       <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
         <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
           <div className="p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold">
                 {data ? `جزئیات خرید گروهی #${data.id}` : "جزئیات خرید گروهی"}
               </h2>
               <button onClick={close} className="text-gray-500 hover:text-gray-700">
                 <FaTimes size={24} />
               </button>
             </div>
   
             {loading ? (
               <div className="text-center py-8">در حال بارگذاری...</div>
             ) : error ? (
               <div className="text-center py-8 text-red-600">
                 خطا در دریافت جزئیات: {error}
               </div>
             ) : data ? (
               <>
                 <div className="grid md:grid-cols-2 gap-6 mb-6">
                   <div>
                    <h3 className="font-semibold mb-3">اطلاعات ایجادکننده</h3>
                    <div className="bg-gray-50 p-4 rounded">
                      <p>
                        <strong>نام:</strong> {data.creator_name || "—"}
                      </p>
                      <p>
                        <strong>{data.creator_phone && (data.creator_phone.startsWith('@') || data.creator_phone.startsWith('TG:')) ? 'شناسه تلگرام:' : 'تلفن:'}</strong> {data.creator_phone || "—"}
                      </p>
                       {data.creator_email && (
                         <p>
                           <strong>ایمیل:</strong> {data.creator_email}
                         </p>
                       )}
                     </div>
                   </div>
                   <div>
                     <h3 className="font-semibold mb-3">اطلاعات خرید گروهی</h3>
                     <div className="bg-gray-50 p-4 rounded">
                       <p>
                         <strong>محصول:</strong> {data.product_name}
                       </p>
                       <p>
                         <strong>کد دعوت:</strong>{" "}
                         <code className="bg-gray-200 px-2 py-1 rounded">
                           {data.invite_code}
                         </code>
                       </p>
                       <p>
                         <strong>وضعیت:</strong>{" "}
                         <span
                           className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${color(
                             data.status
                           )}`}
                         >
                           {data.status}
                         </span>
                       </p>
                       <p>
                         <strong>ایجاد:</strong>{" "}
                         {toTehranDateTime(data.created_at)}
                       </p>
                       <p>
                         <strong>انقضاء:</strong>{" "}
                         {toTehranDateTime(data.expires_at)}
                       </p>
                     </div>
                   </div>
                 </div>
   
                 <h3 className="font-semibold mb-3">
                   شرکت‌کنندگان ({data.participants?.length ?? 0})
                 </h3>
                 <div className="overflow-x-auto">
                   <table className="min-w-full">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-6 py-3">نام</th>
                         <th className="px-6 py-3">تلفن</th>
                         <th className="px-6 py-3">ایمیل</th>
                         <th className="px-6 py-3">زمان پیوستن</th>
                       </tr>
                     </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.participants?.map((p: any) => {
                          const name = (p.user_name && String(p.user_name).trim()) || (p.name && String(p.name).trim()) || "کاربر ناشناس";
                          const phone = (p.user_phone && String(p.user_phone).trim()) || (p.phone && String(p.phone).trim()) || "";
                          return (
                            <tr key={p.order_id}>
                              <td className="px-6 py-4">{name}</td>
                              <td className="px-6 py-4">{phone}</td>
                              <td className="px-6 py-4">{p.user_email ?? "N/A"}</td>
                              <td className="px-6 py-4">
                                {p.created_at ? toTehranDateTime(p.created_at) : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                   </table>
                 </div>
               </>
             ) : (
               <div className="text-center py-8">اطلاعاتی برای نمایش نیست.</div>
             )}
   
             <div className="mt-6 flex justify-end">
               <button
                 onClick={close}
                 className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
               >
                 بستن
               </button>
             </div>
           </div>
         </div>
       </div>
     );
   } 

  function DeliverySlotsContent() {
    const [days, setDays] = useState<Array<{ date: string; day_off: boolean; slots: Array<{ id?: number; start_time: string; end_time: string; is_active: boolean }> }>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadDays = useCallback(async () => {
      const ctrl = new AbortController();
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJSON<{ days: any[] }>(`${ADMIN_API_BASE_URL}/admin/delivery-slots/next?days=7`, undefined, ctrl.signal);
        const normalized = (data?.days ?? []).map((d: any) => ({
          date: String(d.date),
          day_off: !!d.day_off,
          slots: Array.isArray(d.slots)
            ? d.slots.map((s: any) => ({ id: s.id, start_time: String(s.start_time), end_time: String(s.end_time), is_active: !!s.is_active }))
            : [],
        }));
        setDays(normalized);
      } catch (err: any) {
        if (!isAbort(err)) setError(err?.message ?? "خطای ناشناخته");
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      loadDays();
    }, [loadDays]);

    const toJalaliLabel = (gDate: string): string => {
      try {
        const d = new Date(gDate);
        const fmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
          weekday: 'long',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });
        const parts = fmt.formatToParts(d);
        const map: Record<string, string> = {};
        parts.forEach(p => {
          if (p.type !== 'literal') map[p.type] = p.value;
        });
        const weekday = map.weekday || '';
        const y = map.year || '';
        const m = map.month || '';
        const day = map.day || '';
        return `${weekday} ${day}/${m}/${y}`;
      } catch {
        return gDate;
      }
    };

    const setDayOff = async (date: string, dayOff: boolean) => {
      await fetchJSON(`${ADMIN_API_BASE_URL}/admin/delivery-slots/set-day-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, day_off: dayOff }),
      });
      await loadDays();
    };

    const upsertDay = async (date: string, slots: Array<{ start_time: string; end_time: string; is_active: boolean }>) => {
      await fetchJSON(`${ADMIN_API_BASE_URL}/admin/delivery-slots/upsert-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, slots }),
      });
      await loadDays();
    };

    const toggleSlot = async (slotId: number, isActive: boolean) => {
      await fetchJSON(`${ADMIN_API_BASE_URL}/admin/delivery-slots/${slotId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      });
      await loadDays();
    };

    const deleteSlot = async (slotId: number) => {
      await fetchJSON(`${ADMIN_API_BASE_URL}/admin/delivery-slots/${slotId}`, { method: 'DELETE' });
      await loadDays();
    };

    const addEmptySlot = (idx: number) => {
      setDays(prev => {
        const copy = [...prev];
        const day = { ...copy[idx] };
        day.slots = [...day.slots, { start_time: '12:00', end_time: '14:00', is_active: true }];
        copy[idx] = day;
        return copy;
      });
    };

    const editSlotField = (dayIndex: number, slotIndex: number, field: 'start_time' | 'end_time' | 'is_active', value: string | boolean) => {
      setDays(prev => {
        const copy = [...prev];
        const day = { ...copy[dayIndex] };
        const slots = [...day.slots];
        const slot = { ...slots[slotIndex], [field]: value } as any;
        slots[slotIndex] = slot;
        day.slots = slots;
        copy[dayIndex] = day;
        return copy;
      });
    };

    const saveDay = async (idx: number) => {
      const d = days[idx];
      const payload = d.slots.map(s => ({ start_time: s.start_time, end_time: s.end_time, is_active: s.is_active }));
      await upsertDay(d.date, payload);
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">بازه‌های تحویل (۷ روز آینده)</h2>
        {loading ? (
          <div>در حال بارگذاری…</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="space-y-6">
            {days.map((d, idx) => (
              <div key={d.date} className="border rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium">{toJalaliLabel(d.date)}</div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={d.day_off}
                        onChange={async (e) => await setDayOff(d.date, e.target.checked)}
                      />
                      <span>تعطیل</span>
                    </label>
                    {!d.day_off && (
                      <button
                        onClick={() => addEmptySlot(idx)}
                        className="px-3 py-1 bg-blue-600 text-white rounded"
                      >
                        افزودن بازه
                      </button>
                    )}
                  </div>
                </div>

                {!d.day_off && (
                  <div className="space-y-3">
                    {d.slots.length === 0 && (
                      <div className="text-sm text-gray-500">هیچ بازه‌ای تعیین نشده است.</div>
                    )}
                    {d.slots.map((s, si) => (
                      <div key={si} className="flex items-center gap-3">
                        <input
                          className="border rounded p-2 w-24 text-center"
                          placeholder="HH:MM"
                          value={s.start_time}
                          onChange={(e) => editSlotField(idx, si, 'start_time', e.target.value)}
                        />
                        <span>تا</span>
                        <input
                          className="border rounded p-2 w-24 text-center"
                          placeholder="HH:MM"
                          value={s.end_time}
                          onChange={(e) => editSlotField(idx, si, 'end_time', e.target.value)}
                        />
                        <label className="flex items-center gap-2 mr-3">
                          <input
                            type="checkbox"
                            checked={!!s.is_active}
                            onChange={(e) => editSlotField(idx, si, 'is_active', e.target.checked)}
                          />
                          <span>فعال</span>
                        </label>
                        {s.id ? (
                          <>
                            <button
                              className="px-3 py-1 bg-yellow-600 text-white rounded"
                              onClick={() => toggleSlot(s.id!, !s.is_active)}
                            >
                              {s.is_active ? 'غیرفعال' : 'فعال'} کردن
                            </button>
                            <button
                              className="px-3 py-1 bg-red-600 text-white rounded"
                              onClick={() => deleteSlot(s.id!)}
                            >
                              حذف
                            </button>
                          </>
                        ) : null}
                      </div>
                    ))}
                    <div>
                      <button
                        onClick={() => saveDay(idx)}
                        className="px-4 py-2 bg-green-600 text-white rounded"
                      >
                        ذخیره روز
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  /* --------------------------------------------------------------------------
     Reviews (Fake Reviews Generator)
     -------------------------------------------------------------------------- */
  
  function ReviewsContent() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [singleRating, setSingleRating] = useState<number>(5);
    const [singleComment, setSingleComment] = useState<string>("");
    const [singleDisplayName, setSingleDisplayName] = useState<string>("");
    const [creating, setCreating] = useState(false);
    const [singleUserId, setSingleUserId] = useState<string>("");
  const [defaultUserId, setDefaultUserId] = useState<string>("");
  const [defaultUserName, setDefaultUserName] = useState<string>("");
  const [reviews, setReviews] = useState<any[]>([]);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editComment, setEditComment] = useState<string>("");
  const [editDisplayName, setEditDisplayName] = useState<string>("");
  const [editCreatedAt, setEditCreatedAt] = useState<string>("");
  const [singleCreatedAt, setSingleCreatedAt] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

    useEffect(() => {
      const ctrl = new AbortController();
      let alive = true;
      (async () => {
        try {
          setLoading(true);
          setError(null);
          const list = await fetchJSON<any[]>(`${ADMIN_API_BASE_URL}/admin/products`, undefined, ctrl.signal);
          if (!alive) return;
          setProducts(Array.isArray(list) ? list : []);
        } catch (err: any) {
          if (!isAbort(err)) {
            console.error('Load products error:', err);
            if (alive) setError(err?.message ?? 'خطای ناشناخته');
          }
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => { alive = false; ctrl.abort(); };
    }, []);

    // Load a default user to attach to fake reviews (backend requires valid user_id)
    useEffect(() => {
      const ctrl = new AbortController();
      let alive = true;
      (async () => {
        try {
          const users = await fetchJSON<any[]>(`${ADMIN_API_BASE_URL}/admin/users${qs({})}`, undefined, ctrl.signal);
          if (!alive) return;
          if (Array.isArray(users) && users.length > 0) {
            const u = users[0];
            setDefaultUserId(String(u.id));
            setDefaultUserName(`${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || `کاربر #${u.id}`);
          }
        } catch (err) {
          if (!isAbort(err)) console.error('Load users error:', err);
        }
      })();
      return () => { alive = false; ctrl.abort(); };
    }, []);

    const createSingle = () => {
      console.log('🚀 createSingle called!');
      if (!selectedProductId) { 
        alert('یک محصول انتخاب کنید'); 
        return; 
      }
      if (!singleRating || singleRating < 1 || singleRating > 5) { 
        alert('امتیاز بین 1 تا 5'); 
        return; 
      }
      if (!singleDisplayName.trim()) {
        alert('نام کاربری برای نظر الزامی است');
        return;
      }
      
      console.log('📝 About to create review:', { selectedProductId, singleRating, singleComment });
      setCreating(true);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/reviews', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      xhr.onreadystatechange = function() {
        console.log('📡 XHR state:', xhr.readyState, 'Status:', xhr.status);
        if (xhr.readyState === 4) {
          console.log('✅ XHR completed. Status:', xhr.status, 'Response:', xhr.responseText);
          setCreating(false);
          if (xhr.status === 200) {
            setSingleComment('');
            refreshReviews(); // Refresh the reviews list
            alert('ثبت شد');
          } else {
            alert('خطا در ثبت نظر: ' + xhr.status);
          }
        }
      };
      
      const payload: any = {
        product_id: parseInt(selectedProductId),
        rating: singleRating,
        comment: singleComment || '',
        display_name: singleDisplayName.trim()
      };
      
      if (singleUserId && singleUserId.match(/^\d+$/)) {
        payload.user_id = parseInt(singleUserId);
      } else if (defaultUserId) {
        payload.user_id = parseInt(defaultUserId);
      }
      if (singleCreatedAt) {
        const dt = new Date(singleCreatedAt);
        if (!isNaN(dt.getTime())) payload.created_at = dt.toISOString();
      }
      
      xhr.send(JSON.stringify(payload));
    };

    const fakeNames = ['علی', 'زهرا', 'محمد', 'فاطمه', 'رضا', 'مهدی', 'سارا', 'حسین', 'نرگس', 'نگار'];
    const fakeComments = [
      'کیفیت عالی بود، پیشنهاد می‌کنم!',
      'بسته‌بندی خوب و ارسال سریع.',
      'نسبت به قیمت ارزش خرید دارد.',
      'از خریدم راضی بودم.',
      'طعم و تازگی خوبی داشت.',
      'دقیقاً مطابق توضیحات بود.',
      'به موقع رسید، متشکرم.',
      'کیفیت متوسط ولی قابل قبول.',
      'در کل خوب بود.',
      'خیلی دوست داشتم، دوباره می‌خرم.',
    ];

    const randomPick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // بخش ایجاد دسته‌ای حذف شد

    // Delete a review
    const deleteReview = async (reviewId: number) => {
      if (!confirm('آیا از حذف این نظر اطمینان دارید؟')) return;

      try {
        const res = await fetch(`${API_BASE_URL}/product/${selectedProductId}/reviews/${reviewId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete review');
        setReviews(reviews.filter(r => r.id !== reviewId));
        alert('نظر با موفقیت حذف شد');
      } catch (err) {
        console.error('Delete review error:', err);
        alert('خطا در حذف نظر');
      }
    };

    // Start editing a review
    const startEditReview = (review: any) => {
      setEditingReview(review);
      setEditRating(review.rating);
      setEditComment(review.comment || '');
      setEditDisplayName((review.display_name ?? '').trim());
      // ISO string input value for datetime-local: 'YYYY-MM-DDTHH:MM'
      try {
        const d = review.created_at ? new Date(review.created_at) : null;
        if (d) {
          const pad = (n: number) => String(n).padStart(2, '0');
          const val = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setEditCreatedAt(val);
        } else {
          setEditCreatedAt('');
        }
      } catch {
        setEditCreatedAt('');
      }
    };

    // Save edited review
    const saveEditReview = async () => {
      if (!editingReview) return;
      if (!editDisplayName.trim()) { alert('نام کاربری الزامی است'); return; }

      try {
        const payload: any = { rating: editRating, comment: editComment, display_name: editDisplayName.trim() };
        if (editCreatedAt) {
          // Convert local datetime to ISO
          const dt = new Date(editCreatedAt);
          if (!isNaN(dt.getTime())) payload.created_at = dt.toISOString();
        }
      const res = await fetch(`${API_BASE_URL}/product/${selectedProductId}/reviews/${editingReview.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update review');
      // Reload from backend to reflect server timestamp accurately
      await refreshReviews();
        setEditingReview(null);
        alert('نظر با موفقیت ویرایش شد');
      } catch (err) {
        console.error('Update review error:', err);
        alert('خطا در ویرایش نظر');
      }
    };

    // Load reviews for selected product (using admin API to get ALL reviews including unapproved)
    useEffect(() => {
      if (!selectedProductId) {
        setReviews([]);
        return;
      }

      const ctrl = new AbortController();
      let alive = true;
      (async () => {
        try {
          // Use admin API to get all reviews (approved + unapproved) for this product
          const data = await fetchJSON<any[]>(`${ADMIN_API_BASE_URL}/admin/reviews?product_id=${selectedProductId}`, undefined, ctrl.signal);
          if (!alive) return;
          setReviews(Array.isArray(data) ? data : []);
        } catch (err) {
          if (!isAbort(err)) console.error('Load reviews error:', err);
        }
      })();
      return () => { alive = false; ctrl.abort(); };
    }, [selectedProductId]);

    // Refresh reviews list (using admin API to get ALL reviews)
    const refreshReviews = () => {
      if (!selectedProductId) return;
      const ctrl = new AbortController();
      (async () => {
        try {
          // Use admin API to get all reviews (approved + unapproved) for this product
          const data = await fetchJSON<any[]>(`${ADMIN_API_BASE_URL}/admin/reviews?product_id=${selectedProductId}`, undefined, ctrl.signal);
          setReviews(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Refresh reviews error:', err);
        }
      })();
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6">نظرات فیک</h2>
        {loading ? (
          <div className="text-center py-8">در حال بارگذاری...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">خطا: {error}</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">انتخاب محصول</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">— انتخاب کنید —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-3">افزودن تکی</h3>
                <div className="grid gap-3">
              <div>
                <label className="block text-sm mb-1">نام کاربری (الزامی)</label>
                <input className="w-full border rounded px-3 py-2" placeholder="مثلاً علی" value={singleDisplayName} onChange={(e) => setSingleDisplayName(e.target.value)} />
              </div>
              <div>
                    <label className="block text-sm mb-1">شناسه کاربر (اختیاری)</label>
                    <input className="w-full border rounded px-3 py-2" placeholder="مثلاً 1" value={singleUserId} onChange={(e) => setSingleUserId(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">امتیاز</label>
                    <select className="w-full border rounded px-3 py-2" value={singleRating} onChange={(e) => setSingleRating(Number(e.target.value))}>
                      {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">نظر (اختیاری)</label>
                    <textarea className="w-full border rounded px-3 py-2" rows={3} value={singleComment} onChange={(e) => setSingleComment(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">تاریخ ثبت نظر</label>
                    <input type="datetime-local" className="w-full border rounded px-3 py-2" value={singleCreatedAt} onChange={(e) => setSingleCreatedAt(e.target.value)} />
                  </div>
                  <button disabled={creating} onClick={createSingle} className="bg-blue-600 text-white px-4 py-2 rounded">
                    {creating ? 'در حال ثبت...' : 'ثبت نظر'}
                  </button>
                </div>
              </div>

              {/* بخش ایجاد دسته‌ای حذف شد بنا به درخواست */}
            </div>

            {/* Reviews List */}
            {selectedProductId && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">نظرات محصول</h3>
                  <button
                    onClick={refreshReviews}
                    className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                  >
                    تازه‌سازی
                  </button>
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    هنوز نظری برای این محصول وجود ندارد
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <div key={review.id} className="border rounded-lg p-4 bg-gray-50">
                        {editingReview?.id === review.id ? (
                          // Edit mode
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm mb-1">امتیاز</label>
                              <select
                                className="w-full border rounded px-3 py-2"
                                value={editRating}
                                onChange={(e) => setEditRating(Number(e.target.value))}
                              >
                                {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm mb-1">نام کاربری</label>
                              <input
                                className="w-full border rounded px-3 py-2"
                                placeholder="مثلاً علی"
                                value={editDisplayName}
                                onChange={(e) => setEditDisplayName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-sm mb-1">نظر</label>
                              <textarea
                                className="w-full border rounded px-3 py-2"
                                rows={3}
                                value={editComment}
                                onChange={(e) => setEditComment(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-sm mb-1">تاریخ ثبت نظر</label>
                              <input
                                type="datetime-local"
                                className="w-full border rounded px-3 py-2"
                                value={editCreatedAt}
                                onChange={(e) => setEditCreatedAt(e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditReview}
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                              >
                                ذخیره
                              </button>
                              <button
                                onClick={() => setEditingReview(null)}
                                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                              >
                                انصراف
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">امتیاز: {review.rating}</span>
                                <div className="flex">
                                  {[1,2,3,4,5].map(i => (
                                    <span key={i} className={`text-lg ${i <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                                      ★
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEditReview(review)}
                                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                                >
                                  ویرایش
                                </button>
                                <button
                                  onClick={() => deleteReview(review.id)}
                                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                                >
                                  حذف
                                </button>
                              </div>
                            </div>
                            <p className="text-gray-700">{review.comment || 'بدون نظر'}</p>
                            <div className="text-xs text-gray-500 mt-2">
                              {(() => {
                                const dn = String(review.display_name ?? '').trim();
                                if (dn) return dn;
                                if (review.first_name && review.last_name) return `${review.first_name} ${review.last_name}`;
                                return `کاربر ${review.user_id}`;
                              })()}
                              {' '}• {new Date(review.created_at).toLocaleDateString('fa-IR')}
                              {' '}• محصول: {(() => { const p = products.find((x:any) => String(x.id) === String(selectedProductId)); return p ? `${p.name} (#${p.id})` : `#${selectedProductId}`; })()}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     Pending Reviews (User Review Approval)
     -------------------------------------------------------------------------- */

  function PendingReviewsContent() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
    const [products, setProducts] = useState<any[]>([]);

    // Load all products for product name display
    useEffect(() => {
      const ctrl = new AbortController();
      let alive = true;
      (async () => {
        try {
          const data = await fetchJSON<any[]>(`${ADMIN_API_BASE_URL}/admin/products?limit=10000`, undefined, ctrl.signal);
          if (!alive) return;
          setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
          if (!isAbort(err)) console.error('Load products error:', err);
        }
      })();
      return () => { alive = false; ctrl.abort(); };
    }, []);

    // Load reviews based on filter
    const loadReviews = useCallback(async () => {
      setLoading(true);
      try {
        const approvedParam = filter === 'all' ? '' : `&approved=${filter === 'approved' ? 'true' : 'false'}`;
        const url = `${ADMIN_API_BASE_URL}/admin/reviews?limit=1000${approvedParam}`;
        const data = await fetchJSON<any[]>(url);
        setReviews(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Load reviews error:', err);
      } finally {
        setLoading(false);
      }
    }, [filter]);

    useEffect(() => {
      loadReviews();
    }, [loadReviews]);

    const approveReview = async (reviewId: number) => {
      try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/admin/reviews/${reviewId}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('خطا در تایید نظر');
        }

        alert('نظر با موفقیت تایید شد');
        loadReviews();
      } catch (err) {
        console.error('Approve review error:', err);
        alert('خطا در تایید نظر');
      }
    };

    const rejectReview = async (reviewId: number) => {
      try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/admin/reviews/${reviewId}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('خطا در رد نظر');
        }

        alert('نظر رد شد');
        loadReviews();
      } catch (err) {
        console.error('Reject review error:', err);
        alert('خطا در رد نظر');
      }
    };

    const deleteReview = async (reviewId: number) => {
      if (!confirm('آیا از حذف این نظر اطمینان دارید؟')) return;

      try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/admin/reviews/${reviewId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('خطا در حذف نظر');
        }

        alert('نظر با موفقیت حذف شد');
        loadReviews();
      } catch (err) {
        console.error('Delete review error:', err);
        alert('خطا در حذف نظر');
      }
    };

    const getProductName = (productId: number) => {
      const product = products.find(p => p.id === productId);
      return product ? product.name : `محصول #${productId}`;
    };

    const getUserDisplayName = (review: any) => {
      if (review.display_name) return review.display_name;
      if (review.first_name || review.last_name) {
        return `${review.first_name || ''} ${review.last_name || ''}`.trim();
      }
      return `کاربر #${review.user_id}`;
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6">مدیریت نظرات کاربران</h2>

        {/* Filter buttons */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            در انتظار تایید ({reviews.filter(r => !r.approved).length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            تایید شده ({reviews.filter(r => r.approved).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            همه ({reviews.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">در حال بارگذاری...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">نظری یافت نشد</div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={`border rounded-lg p-4 ${
                  review.approved ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{getProductName(review.product_id)}</h3>
                    <p className="text-sm text-gray-600">
                      توسط: {getUserDisplayName(review)} • 
                      {new Date(review.created_at).toLocaleDateString('fa-IR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!review.approved ? (
                      <button
                        onClick={() => approveReview(review.id)}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                      >
                        تایید
                      </button>
                    ) : (
                      <button
                        onClick={() => rejectReview(review.id)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm"
                      >
                        لغو تایید
                      </button>
                    )}
                    <button
                      onClick={() => deleteReview(review.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                    >
                      حذف
                    </button>
                  </div>
                </div>

                {/* Rating stars */}
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-sm text-gray-600 ml-2">امتیاز:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                      ★
                    </span>
                  ))}
                  <span className="text-sm text-gray-600 mr-2">({review.rating}/5)</span>
                </div>

                {/* Comment */}
                {review.comment && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <p className="text-gray-700">{review.comment}</p>
                  </div>
                )}

                {/* Status badge */}
                <div className="mt-3">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      review.approved
                        ? 'bg-green-200 text-green-800'
                        : 'bg-yellow-200 text-yellow-800'
                    }`}
                  >
                    {review.approved ? 'تایید شده' : 'در انتظار تایید'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function SecondaryGroupBuysContent() {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [groups, setGroups] = React.useState<any[]>([]);

    React.useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          setLoading(true);
          setError(null);
          // Fetch secondary groups from admin API using auto-detected URL
          const BASE = getAdminApiBaseUrl();
          // Add timestamp to prevent browser caching
          const timestamp = new Date().getTime();
          const res = await fetch(`${BASE}/admin/secondary-groups?limit=1000&_t=${timestamp}`, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              // Fallback to payment orders (public) if auth blocked
              throw new Error('عدم دسترسی. لطفاً صفحه را مجدداً بارگذاری کنید');
            }
            throw new Error(`خطا در دریافت اطلاعات (HTTP ${res.status})`);
          }
          const data = await res.json();
          if (cancelled) return;
          // Data is already filtered for secondary groups by the API
          const groupsArr = Array.isArray(data) ? data : [];
          setGroups(groupsArr);
        } catch (e: any) {
          if (!cancelled) setError(e?.message || 'خطا در دریافت لیست خرید گروهی ثانویه');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, []);

    return (
      <>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">خرید گروهی ثانویه</h2>
          {loading ? (
            <div className="text-center py-8">در حال بارگذاری...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">#</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">رهبر</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">وضعیت</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">اعضا</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">اعضای پرداخت‌شده</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">ایجاد</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">انقضاء</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {groups.map((g: any) => (
                    <tr key={g.id}>
                      <td className="px-4 py-2 text-sm">{g.id}</td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{g.leader_name || 'نامشخص'}</span>
                          <span className="text-xs text-gray-500">{g.leader_phone || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          g.status === 'موفق' ? 'bg-green-100 text-green-800' :
                          g.status === 'ناموفق' ? 'bg-red-100 text-red-800' :
                          g.status === 'منتظر عضو' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{g.participants || 0}</td>
                      <td className="px-4 py-2 text-sm">{g.paid || 0}</td>
                      <td className="px-4 py-2 text-sm">
                        {g.created_at ? toTehranDateTime(g.created_at) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {g.expires_at ? toTehranDateTime(g.expires_at) : '-'}
                      </td>
                    </tr>
                  ))}
                  {groups.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">موردی یافت نشد</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  /* --------------------------------------------------------------------------
     Popular Searches Management
     -------------------------------------------------------------------------- */
  
  interface PopularSearch {
    id: number;
    search_term: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }

  function PopularSearchesContent() {
    const [searches, setSearches] = useState<PopularSearch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [newSearchTerm, setNewSearchTerm] = useState("");
    const [editSearchTerm, setEditSearchTerm] = useState("");
    const [creating, setCreating] = useState(false);

    // Fetch popular searches
    const fetchSearches = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getAdminAuthToken();
        const response = await fetch(`${ADMIN_API_BASE_URL}/popular-searches?include_inactive=true`, {
          headers: {
            ...API_INIT.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        
        if (!response.ok) {
          throw new Error(`خطا در دریافت جستجوهای پرطرفدار: ${response.statusText}`);
        }
        
        const data = await response.json();
        setSearches(data);
      } catch (err: any) {
        console.error("Error fetching popular searches:", err);
        setError(err.message || "خطای ناشناخته");
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchSearches();
    }, [fetchSearches]);

    // Create new popular search
    const handleCreate = async () => {
      if (!newSearchTerm.trim()) {
        alert("لطفاً عبارت جستجو را وارد کنید");
        return;
      }

      try {
        setCreating(true);
        const token = getAdminAuthToken();
        const response = await fetch(`${ADMIN_API_BASE_URL}/popular-searches`, {
          method: "POST",
          headers: {
            ...API_INIT.headers,
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            search_term: newSearchTerm,
            sort_order: searches.length,
            is_active: true,
          }),
        });

        if (!response.ok) {
          throw new Error("خطا در ایجاد جستجوی پرطرفدار");
        }

        setNewSearchTerm("");
        await fetchSearches();
        alert("جستجوی پرطرفدار با موفقیت ایجاد شد");
      } catch (err: any) {
        console.error("Error creating popular search:", err);
        alert(err.message || "خطای ناشناخته");
      } finally {
        setCreating(false);
      }
    };

    // Update popular search
    const handleUpdate = async (id: number) => {
      if (!editSearchTerm.trim()) {
        alert("لطفاً عبارت جستجو را وارد کنید");
        return;
      }

      try {
        const token = getAdminAuthToken();
        const response = await fetch(`${ADMIN_API_BASE_URL}/popular-searches/${id}`, {
          method: "PUT",
          headers: {
            ...API_INIT.headers,
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            search_term: editSearchTerm,
          }),
        });

        if (!response.ok) {
          throw new Error("خطا در ویرایش جستجوی پرطرفدار");
        }

        setEditingId(null);
        setEditSearchTerm("");
        await fetchSearches();
        alert("جستجوی پرطرفدار با موفقیت ویرایش شد");
      } catch (err: any) {
        console.error("Error updating popular search:", err);
        alert(err.message || "خطای ناشناخته");
      }
    };

    // Toggle active status
    const handleToggleActive = async (id: number, currentStatus: boolean) => {
      try {
        const token = getAdminAuthToken();
        const response = await fetch(`${ADMIN_API_BASE_URL}/popular-searches/${id}`, {
          method: "PUT",
          headers: {
            ...API_INIT.headers,
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            is_active: !currentStatus,
          }),
        });

        if (!response.ok) {
          throw new Error("خطا در تغییر وضعیت");
        }

        await fetchSearches();
      } catch (err: any) {
        console.error("Error toggling active status:", err);
        alert(err.message || "خطای ناشناخته");
      }
    };

    // Delete popular search
    const handleDelete = async (id: number) => {
      if (!confirm("آیا از حذف این جستجوی پرطرفدار اطمینان دارید؟")) {
        return;
      }

      try {
        const token = getAdminAuthToken();
        console.log("[PopularSearches] Deleting search with id:", id);
        console.log("[PopularSearches] Token exists:", !!token);
        console.log("[PopularSearches] API URL:", `${ADMIN_API_BASE_URL}/popular-searches/${id}`);
        
        const response = await fetch(`${ADMIN_API_BASE_URL}/popular-searches/${id}`, {
          method: "DELETE",
          headers: {
            ...API_INIT.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        console.log("[PopularSearches] Response status:", response.status);
        
        if (!response.ok) {
          let errorDetail = "";
          try {
            const errorData = await response.json();
            errorDetail = errorData.detail || JSON.stringify(errorData);
          } catch {
            errorDetail = await response.text() || response.statusText;
          }
          console.error("[PopularSearches] Delete error:", response.status, errorDetail);
          throw new Error(`خطا در حذف جستجوی پرطرفدار (${response.status}): ${errorDetail}`);
        }

        await fetchSearches();
        alert("جستجوی پرطرفدار با موفقیت حذف شد");
      } catch (err: any) {
        console.error("Error deleting popular search:", err);
        alert(err.message || "خطای ناشناخته");
      }
    };

    // Move search up/down
    const handleMove = async (index: number, direction: "up" | "down") => {
      const newSearches = [...searches];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      
      if (targetIndex < 0 || targetIndex >= newSearches.length) return;

      // Swap
      [newSearches[index], newSearches[targetIndex]] = [newSearches[targetIndex], newSearches[index]];

      // Update sort_order
      const reorderedIds = newSearches.map(s => s.id);

      try {
        const token = getAdminAuthToken();
        const response = await fetch(`${ADMIN_API_BASE_URL}/popular-searches/reorder`, {
          method: "POST",
          headers: {
            ...API_INIT.headers,
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(reorderedIds),
        });

        if (!response.ok) {
          throw new Error("خطا در تغییر ترتیب");
        }

        await fetchSearches();
      } catch (err: any) {
        console.error("Error reordering searches:", err);
        alert(err.message || "خطای ناشناخته");
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6">مدیریت جستجوهای پرطرفدار</h2>
        
        {/* Create New Search */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">افزودن جستجوی پرطرفدار جدید</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newSearchTerm}
              onChange={(e) => setNewSearchTerm(e.target.value)}
              placeholder="عبارت جستجو..."
              className="flex-1 border rounded px-3 py-2"
              disabled={creating}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newSearchTerm.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {creating ? "در حال افزودن..." : "افزودن"}
            </button>
          </div>
        </div>

        {/* Loading/Error */}
        {loading ? (
          <div className="text-center py-8">در حال بارگذاری...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">خطا: {error}</div>
        ) : (
          <div className="space-y-3">
            {searches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">هیچ جستجوی پرطرفداری یافت نشد</div>
            ) : (
              searches.map((search, index) => (
                <div
                  key={search.id}
                  className={`p-4 border rounded-lg ${
                    search.is_active ? "bg-white" : "bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Move Buttons */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        className="text-gray-600 hover:text-blue-600 disabled:text-gray-300"
                        title="انتقال به بالا"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMove(index, "down")}
                        disabled={index === searches.length - 1}
                        className="text-gray-600 hover:text-blue-600 disabled:text-gray-300"
                        title="انتقال به پایین"
                      >
                        ↓
                      </button>
                    </div>

                    {/* Search Term */}
                    {editingId === search.id ? (
                      <input
                        type="text"
                        value={editSearchTerm}
                        onChange={(e) => setEditSearchTerm(e.target.value)}
                        className="flex-1 border rounded px-3 py-2"
                      />
                    ) : (
                      <div className="flex-1">
                        <span className="font-medium">{search.search_term}</span>
                        {!search.is_active && (
                          <span className="mr-2 text-xs text-gray-500">(غیرفعال)</span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {editingId === search.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(search.id)}
                            className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 text-sm"
                          >
                            ذخیره
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditSearchTerm("");
                            }}
                            className="bg-gray-500 text-white px-4 py-1 rounded hover:bg-gray-600 text-sm"
                          >
                            انصراف
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(search.id);
                              setEditSearchTerm(search.search_term);
                            }}
                            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm"
                          >
                            ویرایش
                          </button>
                          <button
                            onClick={() => handleToggleActive(search.id, search.is_active)}
                            className={`px-4 py-1 rounded text-sm ${
                              search.is_active
                                ? "bg-yellow-600 text-white hover:bg-yellow-700"
                                : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                          >
                            {search.is_active ? "غیرفعال" : "فعال"}
                          </button>
                          <button
                            onClick={() => handleDelete(search.id)}
                            className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 text-sm"
                          >
                            حذف
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }
