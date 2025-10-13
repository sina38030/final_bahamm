/* --------------------------------------------------------------------------
   AdminPage.tsx – robust version with category creation + reliable product add
   -------------------------------------------------------------------------- */

   "use client";

   import { useEffect, useState, useCallback } from "react";
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
   } from "react-icons/fa";
   import { toFa } from "@/utils/toFa";
   import { toTehranDate } from "@/utils/dateUtils";
   
   /* --------------------------------------------------------------------------
      Config
      -------------------------------------------------------------------------- */
   
  // Dynamic API URL construction for admin
  const getAdminApiBaseUrl = () => {
    if (typeof window === 'undefined') {
      return "http://localhost:8001/api";
    }
    
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // Production: use nginx reverse proxy path
    if (hostname === 'bahamm.ir' || hostname === 'www.bahamm.ir' || hostname === 'app.bahamm.ir') {
      return `${protocol}//${hostname}/api`;
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Development: direct connection to backend port
      return `${protocol}//${hostname}:8001/api`;
    } else {
      // Unknown environment, try direct port access
      return `${protocol}//${hostname}:8001/api`;
    }
  };

  const ADMIN_API_BASE_URL = getAdminApiBaseUrl();
   
   /** If your API uses cookie-based auth, keep credentials:"include".
    * If you use Bearer tokens instead, remove `credentials` and add Authorization headers where needed.
    */
   const API_INIT: RequestInit = {
     credentials: "include",
     headers: {
       Accept: "application/json",
     },
   };
   
   type Section =
     | "dashboard"
     | "products"
     | "categories"
     | "orders"
     | "users"
     | "group-buys";
   
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
    user_name: string;
    total_amount: number;
    items: OrderItem[];
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
   
   async function fetchJSON<T>(
     url: string,
     init?: RequestInit,
     signal?: AbortSignal
   ): Promise<T> {
     const res = await fetch(url, { ...API_INIT, ...init, signal });
   
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
     const [activeSection, setActiveSection] = useState<Section>("dashboard");
     const [sidebarOpen, setSidebarOpen] = useState(true);
     const [loading, setLoading] = useState(false);
     const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
       null
     );
     const [dashError, setDashError] = useState<string | null>(null);
   
     /* ---------------- Dashboard load */
     useEffect(() => {
       if (activeSection !== "dashboard") return;
       const ctrl = new AbortController();
       let alive = true;
   
       (async () => {
         try {
           setLoading(true);
           setDashError(null);
           const data = await fetchJSON<DashboardStats>(
             `${ADMIN_API_BASE_URL}/admin/dashboard`,
             undefined,
             ctrl.signal
           );
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
       { id: "orders" as Section, label: "سفارشات", icon: FaShoppingCart },
       { id: "users" as Section, label: "کاربران", icon: FaUsers },
       { id: "group-buys" as Section, label: "خرید گروهی", icon: FaUserFriends },
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
         case "orders":
           return <OrdersContent />;
         case "users":
           return <UsersContent />;
         case "group-buys":
           return <GroupBuysContent />;
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
      description: "",
      base_price: "",
      market_price: "",
      shipping_cost: "",
      category_id: "",
    });
    const [editProduct, setEditProduct] = useState({
      name: "",
      description: "",
      base_price: "",
      market_price: "",
      shipping_cost: "",
      category_id: "",
    });
    const [mainImage, setMainImage] = useState<File | null>(null);
    const [images, setImages] = useState<FileList | null>(null);
    const [reload, setReload] = useState(0);
   
     const loadProducts = useCallback(
       (signal?: AbortSignal) => {
         const query = qs({ search });
         return fetchJSON<any[]>(
           `${ADMIN_API_BASE_URL}/admin/products${query}`,
           undefined,
           signal
         ).then((data) => setProducts(data));
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
        description: product.description || "",
        base_price: product.base_price?.toString() || "",
        market_price: product.market_price?.toString() || "",
        shipping_cost: product.shipping_cost?.toString() || "0",
        category_id: product.category_id?.toString() || "",
      });
      setShowEditModal(true);
    };

    const handleUpdateProduct = async () => {
      if (!editProduct.name.trim()) {
        alert("نام محصول را وارد کنید.");
        return;
      }
      if (!editProduct.base_price || !editProduct.market_price) {
        alert("قیمت محصول را وارد کنید.");
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
        formData.append("description", editProduct.description);
        formData.append("base_price", editProduct.base_price);
        formData.append("market_price", editProduct.market_price);
        formData.append("shipping_cost", editProduct.shipping_cost);
        formData.append("category_id", editProduct.category_id);

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
          description: "",
          base_price: "",
          market_price: "",
          shipping_cost: "",
          category_id: "",
        });
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
       if (newProduct.base_price === "") {
         alert("قیمت پایه را وارد کنید.");
         return;
       }
   
       try {
         setAdding(true);
         const fd = new FormData();
         fd.append("name", newProduct.name.trim());
         fd.append("description", newProduct.description.trim());
   
         fd.append("base_price", String(Number(newProduct.base_price)));
         if (newProduct.market_price !== "")
           fd.append("market_price", String(Number(newProduct.market_price)));
         if (newProduct.shipping_cost !== "")
           fd.append("shipping_cost", String(Number(newProduct.shipping_cost)));
   
         fd.append("category_id", newProduct.category_id);
         if (mainImage) fd.append("main_image", mainImage);
         if (images) Array.from(images).forEach((f) => fd.append("images", f));
   
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
           description: "",
           base_price: "",
           market_price: "",
           shipping_cost: "",
           category_id: "",
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
                   <th className="px-6 py-3">قیمت پایه</th>
                   <th className="px-6 py-3">قیمت بازار</th>
                   <th className="px-6 py-3">عملیات</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                                 {products.filter(p => p.id).map((p) => (
                  <tr key={p.id}>
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
                    <td className="px-6 py-4">{toFa(p.base_price)} تومان</td>
                    <td className="px-6 py-4">{toFa(p.market_price)} تومان</td>
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
                 <textarea
                   placeholder="توضیحات"
                   className="border rounded p-2"
                   value={newProduct.description}
                   onChange={(e) =>
                     setNewProduct({ ...newProduct, description: e.target.value })
                   }
                 />
                 <input
                   type="number"
                   placeholder="قیمت پایه"
                   className="border rounded p-2"
                   value={newProduct.base_price}
                   onChange={(e) =>
                     setNewProduct({ ...newProduct, base_price: e.target.value })
                   }
                 />
                 <input
                   type="number"
                   placeholder="قیمت بازار"
                   className="border rounded p-2"
                   value={newProduct.market_price}
                   onChange={(e) =>
                     setNewProduct({ ...newProduct, market_price: e.target.value })
                   }
                 />
                 <input
                   type="number"
                   placeholder="هزینه ارسال"
                   className="border rounded p-2"
                   value={newProduct.shipping_cost}
                   onChange={(e) =>
                     setNewProduct({ ...newProduct, shipping_cost: e.target.value })
                   }
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
                   onChange={(e) =>
                     setMainImage(e.target.files ? e.target.files[0] : null)
                   }
                 />
                 <input
                   type="file"
                   multiple
                   accept="image/*"
                   onChange={(e) => setImages(e.target.files)}
                 />
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
                <div>
                  <label className="block text-sm font-medium mb-1">توضیحات</label>
                  <textarea
                    value={editProduct.description}
                    onChange={(e) => setEditProduct({...editProduct, description: e.target.value})}
                    className="w-full border rounded px-3 py-2 h-24"
                    placeholder="توضیحات محصول"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">قیمت پایه</label>
                    <input
                      type="number"
                      value={editProduct.base_price}
                      onChange={(e) => setEditProduct({...editProduct, base_price: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="قیمت پایه"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">قیمت بازار</label>
                    <input
                      type="number"
                      value={editProduct.market_price}
                      onChange={(e) => setEditProduct({...editProduct, market_price: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="قیمت بازار"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">هزینه ارسال</label>
                    <input
                      type="number"
                      value={editProduct.shipping_cost}
                      onChange={(e) => setEditProduct({...editProduct, shipping_cost: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      placeholder="هزینه ارسال"
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
    const [newCat, setNewCat] = useState({ name: "", slug: "", image_url: "" });
    const [editCat, setEditCat] = useState({ name: "", slug: "", image_url: "" });
   
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
          const res = await fetch(`${ADMIN_API_BASE_URL}/admin/categories`, {
           method: "POST",
           headers: { "Content-Type": "application/json", ...(API_INIT.headers as any) },
           credentials: API_INIT.credentials,
           body: JSON.stringify({
             name: newCat.name.trim(),
             // Send slug only if provided; many backends auto-generate it
             ...(newCat.slug.trim() ? { slug: newCat.slug.trim() } : {}),
              ...(newCat.image_url.trim() ? { image_url: newCat.image_url.trim() } : {}),
           }),
         });
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
          setNewCat({ name: "", slug: "", image_url: "" });
   
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
        const res = await fetch(`${ADMIN_API_BASE_URL}/admin/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...(API_INIT.headers as any) },
          credentials: API_INIT.credentials,
          body: JSON.stringify({
            name: editCat.name.trim(),
            ...(editCat.slug.trim() ? { slug: editCat.slug.trim() } : {}),
            ...(editCat.image_url.trim() ? { image_url: editCat.image_url.trim() } : {}),
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
        }

        setShowEditCat(false);
        setEditingCategory(null);
        setEditCat({ name: "", slug: "", image_url: "" });
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
                <div className="flex items-center gap-3">
                  {cat.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.image_url} alt={cat.name} className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded" />
                  )}
                  <div>
                    <h3 className="font-semibold">{cat.name}</h3>
                    <p className="text-sm text-gray-600">{cat.slug}</p>
                  </div>
                </div>
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
                    onChange={(e) => setNewCat({ ...newCat, image_url: e.target.value })}
                  />
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
                    onChange={(e) => setEditCat({ ...editCat, image_url: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="مثال: http://localhost:8001/static/category_1/main.jpg"
                  />
                </div>
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
             `${ADMIN_API_BASE_URL}/admin/orders`,
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
       }[s] ?? "bg-gray-100 text-gray-800");
   
     const label = (s: string) =>
       ({
         pending: "در انتظار",
         processing: "در حال پردازش",
         shipped: "ارسال شده",
         completed: "تکمیل شده",
         cancelled: "لغو شده",
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
                           <option value="completed">تکمیل شده</option>
                           <option value="cancelled">لغو شده</option>
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
       }[s] ?? "bg-gray-100 text-gray-800");
   
     const label = (s: string) =>
       ({
         pending: "در انتظار",
         processing: "در حال پردازش",
         shipped: "ارسال شده",
         completed: "تکمیل شده",
         cancelled: "لغو شده",
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
                         {new Date(order.created_at).toLocaleString("fa-IR")}
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
                     <td className="px-6 py-4">{u.coins ? toFa(u.coins) : "-"}</td>
                     <td className="px-6 py-4">
                       {new Date(u.created_at).toLocaleDateString("fa-IR")}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
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
   
     /* --- list */
     useEffect(() => {
       const ctrl = new AbortController();
       let alive = true;
   
       (async () => {
         try {
           setLoading(true);
           setError(null);
           const data = await fetchJSON<any[]>(
             `${ADMIN_API_BASE_URL}/admin/group-buys`,
             undefined,
             ctrl.signal
           );
           if (!alive) return;
           setGroupBuys(data);
         } catch (err: any) {
           if (!isAbort(err)) {
             console.error("Group buys error:", err);
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
                       <td className="px-6 py-4">#{g.id}
                         {String(g?.kind || '').toLowerCase() === 'secondary' && (
                           <span className="mr-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">ثانویه</span>
                         )}
                       </td>
                       <td className="px-6 py-4">{g.product_name}</td>
                       <td className="px-6 py-4">
                         <div>{g.creator_name}</div>
                         <div className="text-sm text-gray-500">{g.creator_phone}</div>
                       </td>
                       <td className="px-6 py-4">
                         <code className="bg-gray-100 px-2 py-1 rounded">
                           {g.invite_code}
                         </code>
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
                         {new Date(g.created_at).toLocaleDateString("fa-IR")}
                       </td>
                       <td className="px-6 py-4">
                         {new Date(g.expires_at).toLocaleDateString("fa-IR")}
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
                         <strong>نام:</strong> {data.creator_name}
                       </p>
                       <p>
                         <strong>تلفن:</strong> {data.creator_phone}
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
                         {new Date(data.created_at).toLocaleString("fa-IR")}
                       </p>
                       <p>
                         <strong>انقضاء:</strong>{" "}
                         {new Date(data.expires_at).toLocaleString("fa-IR")}
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
                       {data.participants?.map((p: any) => (
                         <tr key={p.id}>
                           <td className="px-6 py-4">{p.user_name}</td>
                           <td className="px-6 py-4">{p.user_phone}</td>
                           <td className="px-6 py-4">{p.user_email ?? "N/A"}</td>
                           <td className="px-6 py-4">
                             {new Date(p.joined_at).toLocaleString("fa-IR")}
                           </td>
                         </tr>
                       ))}
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