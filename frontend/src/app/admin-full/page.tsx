/* --------------------------------------------------------------------------
   AdminPage.tsx  –  fully refactored (high‑impact fixes)
   -------------------------------------------------------------------------- */

   "use client";

   import { useState, useEffect } from "react";
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
   
   /* --------------------------------------------------------------------------
      Configuration
      -------------------------------------------------------------------------- */
   
   const ADMIN_API_BASE_URL =
     process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:8001/api";
   
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
     payment_method?: string;
   }
   
   /* --------------------------------------------------------------------------
      Helper – fetch with abort
      -------------------------------------------------------------------------- */
   
   async function fetchJSON<T>(
     url: string,
     init?: RequestInit,
     signal?: AbortSignal
   ): Promise<T> {
     const res = await fetch(url, { ...init, signal });
     if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
     return res.json();
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
   
     /* -------------------------------------------------- Dashboard stats */
     useEffect(() => {
       if (activeSection !== "dashboard") return;
       const controller = new AbortController();
       (async () => {
         try {
           setLoading(true);
           const data = await fetchJSON<DashboardStats>(
             `${ADMIN_API_BASE_URL}/admin/dashboard`,
             undefined,
             controller.signal
           );
           setDashboardStats(data);
         } catch (err) {
           console.error("[Admin] Dashboard fetch failed", err);
           setDashboardStats({
             total_users: 0,
             total_products: 0,
             total_orders: 0,
             total_categories: 0,
             recent_orders: 0,
             total_revenue: 0,
           });
         } finally {
           setLoading(false);
         }
       })();
       return () => controller.abort();
     }, [activeSection]);
   
     /* -------------------------------------------------- Layout helpers */
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
           return <DashboardContent stats={dashboardStats} loading={loading} />;
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
   
     /* -------------------------------------------------- JSX */
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
                       activeSection === item.id ? "bg-blue-700" : "hover:bg-blue-500"
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
   
         {/* Main Content */}
         <div className="flex-1 overflow-auto">
           {/* Header */}
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
           {/* Content */}
           <div className="p-6">{renderContent()}</div>
         </div>
       </div>
     );
   }
   
   /* --------------------------------------------------------------------------
      Dashboard
      -------------------------------------------------------------------------- */
   
   function DashboardContent({
     stats,
     loading,
   }: {
     stats: DashboardStats | null;
     loading: boolean;
   }) {
     if (loading) return <div className="text-center py-8">در حال بارگذاری...</div>;
     if (!stats) return <div className="text-center py-8">خطا در دریافت اطلاعات</div>;
   
     const cards = [
       { title: "کل کاربران", value: stats.total_users, color: "bg-blue-500" },
       { title: "کل محصولات", value: stats.total_products, color: "bg-green-500" },
       { title: "کل سفارشات", value: stats.total_orders, color: "bg-yellow-500" },
       {
         title: "کل دسته‌بندی‌ها",
         value: stats.total_categories,
         color: "bg-purple-500",
       },
       {
         title: "سفارشات اخیر (7 روز)",
         value: stats.recent_orders,
         color: "bg-red-500",
       },
       { title: "درآمد کل", value: toFa(stats.total_revenue), color: "bg-indigo-500" },
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
     const [search, setSearch] = useState("");
     const [showAddModal, setShowAddModal] = useState(false);
     const [categories, setCategories] = useState<any[]>([]);
     const [adding, setAdding] = useState(false);
     const [newProduct, setNewProduct] = useState({
       name: "",
       description: "",
       base_price: "",
       market_price: "",
       shipping_cost: "",
       category_id: "",
     });
     const [mainImage, setMainImage] = useState<File | null>(null);
     const [images, setImages] = useState<FileList | null>(null);
   
     /* -------------------------------------------------- Fetch products */
     useEffect(() => {
       const controller = new AbortController();
       const qs = new URLSearchParams({ search }).toString();
       (async () => {
         try {
           setLoading(true);
           const data = await fetchJSON<any[]>(
             `${ADMIN_API_BASE_URL}/admin/products?${qs}`,
             undefined,
             controller.signal
           );
           setProducts(data);
         } catch (err) {
           console.error("Error fetching products:", err);
         } finally {
           setLoading(false);
         }
       })();
       return () => controller.abort();
     }, [search]);
   
     /* -------------------------------------------------- Categories when modal open */
     useEffect(() => {
       if (!showAddModal) return;
       const controller = new AbortController();
       (async () => {
         try {
           const data = await fetchJSON<any[]>(
             `${ADMIN_API_BASE_URL}/admin/categories`,
             undefined,
             controller.signal
           );
           setCategories(data);
         } catch (err) {
           console.error("Error fetching categories:", err);
         }
       })();
       return () => controller.abort();
     }, [showAddModal]);
   
     /* -------------------------------------------------- Delete */
     const handleDelete = async (id: number) => {
       if (!confirm("آیا از حذف این محصول اطمینان دارید؟")) return;
       try {
         await fetch(`${ADMIN_API_BASE_URL}/admin/products/${id}`, { method: "DELETE" });
         setProducts((p) => p.filter((x) => x.id !== id));
       } catch (err) {
         console.error("Error deleting product:", err);
       }
     };
   
     /* -------------------------------------------------- Add */
     const handleAddProduct = async () => {
       try {
         setAdding(true);
         const fd = new FormData();
         fd.append("name", newProduct.name);
         fd.append("description", newProduct.description);
         fd.append("base_price", String(Number(newProduct.base_price)));
         fd.append("market_price", String(Number(newProduct.market_price)));
         fd.append("shipping_cost", String(Number(newProduct.shipping_cost)));
         fd.append("category_id", newProduct.category_id);
         if (mainImage) fd.append("main_image", mainImage);
         if (images) Array.from(images).forEach((f) => fd.append("images", f));
   
         await fetch(`${ADMIN_API_BASE_URL}/admin/products`, { method: "POST", body: fd });
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
         /* refresh */
         setSearch((s) => s); // trigger useEffect
       } catch (err) {
         console.error("Error adding product:", err);
       } finally {
         setAdding(false);
       }
     };
   
     /* -------------------------------------------------- JSX */
     return (
       <div className="bg-white rounded-lg shadow-md p-6">
         {/* Search & add */}
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
   
         {/* Table */}
         {loading ? (
           <div className="text-center py-8">در حال بارگذاری...</div>
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
                 {products.map((p) => (
                   <tr key={p.id}>
                     <td className="px-6 py-4">
                       {p.main_image && (
                         // use next/image in real project
                         <img
                           src={p.main_image}
                           alt={p.name}
                           className="w-12 h-12 object-cover rounded"
                         />
                       )}
                     </td>
                     <td className="px-6 py-4">{p.name}</td>
                     <td className="px-6 py-4">{p.category_name}</td>
                     <td className="px-6 py-4">{toFa(p.base_price)} تومان</td>
                     <td className="px-6 py-4">{toFa(p.market_price)} تومان</td>
                     <td className="px-6 py-4">
                       <button
                         onClick={() => handleDelete(p.id)}
                         className="text-red-600 hover:text-red-900"
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
   
         {/* Modal */}
         {showAddModal && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
             <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
               {/* Header */}
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">افزودن محصول جدید</h2>
                 <button
                   onClick={() => setShowAddModal(false)}
                   className="text-gray-500 hover:text-gray-700"
                 >
                   <FaTimes size={24} />
                 </button>
               </div>
               {/* Form */}
               <div className="grid grid-cols-1 gap-4">
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
               {/* Actions */}
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
       </div>
     );
   }
   
   /* --------------------------------------------------------------------------
      Categories
      -------------------------------------------------------------------------- */
   
   function CategoriesContent() {
     const [categories, setCategories] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
   
     useEffect(() => {
       const ctrl = new AbortController();
       (async () => {
         try {
           setLoading(true);
           const data = await fetchJSON<any[]>(
             `${ADMIN_API_BASE_URL}/admin/categories`,
             undefined,
             ctrl.signal
           );
           setCategories(data);
         } catch (err) {
           console.error("Error fetching categories:", err);
         } finally {
           setLoading(false);
         }
       })();
       return () => ctrl.abort();
     }, []);
   
     return (
       <div className="bg-white rounded-lg shadow-md p-6">
         <h2 className="text-xl font-semibold mb-6">دسته‌بندی‌ها</h2>
         {loading ? (
           <div className="text-center py-8">در حال بارگذاری...</div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {categories.map((cat) => (
               <div key={cat.id} className="border rounded-lg p-4">
                 <h3 className="font-semibold">{cat.name}</h3>
                 <p className="text-sm text-gray-600">{cat.slug}</p>
               </div>
             ))}
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
     const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
     const [loadingDetails, setLoadingDetails] = useState(false);
     const [showDetailsModal, setShowDetailsModal] = useState(false);
   
     /* -------------------------------------------------- fetch orders */
     const refreshOrders = () => {
       const ctrl = new AbortController();
       (async () => {
         try {
           setLoading(true);
           const data = await fetchJSON<any[]>(
             `${ADMIN_API_BASE_URL}/admin/orders`,
             undefined,
             ctrl.signal
           );
           setOrders(data);
         } catch (err) {
           console.error("Error fetching orders:", err);
           setOrders([]);
         } finally {
           setLoading(false);
         }
       })();
       return () => ctrl.abort();
     };
   
     useEffect(refreshOrders, []);
   
     /* -------------------------------------------------- details */
     const fetchOrderDetails = async (id: number) => {
       try {
         setLoadingDetails(true);
         const data = await fetchJSON<OrderDetail>(
           `${ADMIN_API_BASE_URL}/admin/orders/${id}`
         );
         setSelectedOrder(data);
         setShowDetailsModal(true);
       } catch (err) {
         console.error("Error fetching order details:", err);
       } finally {
         setLoadingDetails(false);
       }
     };
   
     /* -------------------------------------------------- update status */
     const updateOrderStatus = async (id: number, status: string) => {
       try {
         await fetch(`${ADMIN_API_BASE_URL}/admin/orders/${id}/status`, {
           method: "PUT",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ status }),
         });
         setOrders((prev) =>
           prev.map((o) => (o.id === id ? { ...o, status } : o))
         );
         if (selectedOrder?.id === id) setSelectedOrder({ ...selectedOrder, status });
       } catch (err) {
         console.error("Error updating status:", err);
       }
     };
   
     const getStatusColor = (s: string) =>
       ({
         completed: "bg-green-100 text-green-800",
         processing: "bg-blue-100 text-blue-800",
         shipped: "bg-purple-100 text-purple-800",
         cancelled: "bg-red-100 text-red-800",
         pending: "bg-yellow-100 text-yellow-800",
       }[s] ?? "bg-gray-100 text-gray-800");
   
     const getStatusLabel = (s: string) =>
       ({
         pending: "در انتظار",
         processing: "در حال پردازش",
         shipped: "ارسال شده",
         completed: "تکمیل شده",
         cancelled: "لغو شده",
       }[s] ?? s);
   
     /* -------------------------------------------------- JSX */
     return (
       <>
         <div className="bg-white rounded-lg shadow-md p-6">
           <h2 className="text-xl font-semibold mb-6">سفارشات</h2>
           {loading ? (
             <div className="text-center py-8">در حال بارگذاری...</div>
           ) : (
             <div className="overflow-x-auto">
               <table className="min-w-full">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3">شماره سفارش</th>
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
                       <td className="px-6 py-4">#{o.id}</td>
                       <td className="px-6 py-4">
                         <div>{o.user_name}</div>
                         <div className="text-sm text-gray-500">{o.user_phone}</div>
                       </td>
                       <td className="px-6 py-4">{toFa(o.total_amount)} تومان</td>
                       <td className="px-6 py-4">
                         <span
                           className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                             o.status
                           )}`}
                         >
                           {getStatusLabel(o.status)}
                         </span>
                       </td>
                       <td className="px-6 py-4">
                         {new Date(o.created_at).toLocaleDateString("fa-IR")}
                       </td>
                       <td className="px-6 py-4">
                         <button
                           onClick={() => fetchOrderDetails(o.id)}
                           className="text-blue-600 hover:text-blue-900 ml-3"
                           disabled={loadingDetails}
                         >
                           <FaEye />
                         </button>
                         <select
                           className="text-sm border rounded px-2 py-1"
                           value={o.status}
                           onChange={(e) => updateOrderStatus(o.id, e.target.value)}
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
   
         {/* Modal */}
         {showDetailsModal && selectedOrder && (
           <OrderDetailsModal
             order={selectedOrder}
             close={() => setShowDetailsModal(false)}
           />
         )}
       </>
     );
   }
   
   /* --------------------------------------------------------------------------
      Order details modal (extracted for clarity)
      -------------------------------------------------------------------------- */
   
   function OrderDetailsModal({
     order,
     close,
   }: {
     order: OrderDetail;
     close: () => void;
   }) {
     const getColor = (s: string) =>
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
               <h2 className="text-2xl font-bold">جزئیات سفارش #{order.id}</h2>
               <button onClick={close} className="text-gray-500 hover:text-gray-700">
                 <FaTimes size={24} />
               </button>
             </div>
   
             {/* user + order info */}
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
                     <strong>وضعیت:</strong>
                     <span
                       className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getColor(
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
   
             {/* address */}
             {order.shipping_address && (
               <div className="mb-6">
                 <h3 className="font-semibold mb-3">آدرس ارسال</h3>
                 <div className="bg-gray-50 p-4 rounded">
                   <p>{order.shipping_address}</p>
                 </div>
               </div>
             )}
   
             {/* items */}
             <h3 className="font-semibold mb-3">
               اقلام سفارش ({order.items.length})
             </h3>
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
                     <td colSpan={3} className="px-6 py-3 text-right font-semibold">
                       جمع کل:
                     </td>
                     <td className="px-6 py-3 font-semibold">
                       {toFa(order.total_amount)} تومان
                     </td>
                   </tr>
                 </tfoot>
               </table>
             </div>
   
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
     const [search, setSearch] = useState("");
   
     useEffect(() => {
       const ctrl = new AbortController();
       const qs = new URLSearchParams({ search }).toString();
       (async () => {
         try {
           setLoading(true);
           const data = await fetchJSON<any[]>(
             `${ADMIN_API_BASE_URL}/admin/users?${qs}`,
             undefined,
             ctrl.signal
           );
           setUsers(data);
         } catch (err) {
           console.error("Error fetching users:", err);
           setUsers([]);
         } finally {
           setLoading(false);
         }
       })();
       return () => ctrl.abort();
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
                     <td className="px-6 py-4">{u.first_name} {u.last_name}</td>
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
     const [selectedGroupBuy, setSelectedGroupBuy] = useState<any | null>(null);
     const [loadingDetails, setLoadingDetails] = useState(false);
     const [showDetailsModal, setShowDetailsModal] = useState(false);
   
     /* -------------------------------------------------- fetch */
     useEffect(() => {
       const ctrl = new AbortController();
       (async () => {
         try {
           setLoading(true);
           const data = await fetchJSON<any[]>(
             `${ADMIN_API_BASE_URL}/admin/group-buys`,
             undefined,
             ctrl.signal
           );
           setGroupBuys(data);
         } catch (err) {
           console.error("Error fetching group buys:", err);
           setGroupBuys([]);
         } finally {
           setLoading(false);
         }
       })();
       return () => ctrl.abort();
     }, []);
   
     /* -------------------------------------------------- details */
     const fetchGroupBuyDetails = async (id: number) => {
       try {
         setLoadingDetails(true);
         const data = await fetchJSON<any>(
           `${ADMIN_API_BASE_URL}/admin/group-buys/${id}`
         );
         setSelectedGroupBuy(data);
         setShowDetailsModal(true);
       } catch (err) {
         console.error("Error fetching group buy details:", err);
       } finally {
         setLoadingDetails(false);
       }
     };
   
     const statusColor = (s: string) =>
       ({
         /* persian */ "تکمیل شده": "bg-green-100 text-green-800",
         فعال: "bg-blue-100 text-blue-800",
         "در انتظار": "bg-yellow-100 text-yellow-800",
         منقضی: "bg-red-100 text-red-800",
         /* english fallback */
         completed: "bg-green-100 text-green-800",
         active: "bg-blue-100 text-blue-800",
         pending: "bg-yellow-100 text-yellow-800",
         expired: "bg-red-100 text-red-800",
       }[s] ?? "bg-gray-100 text-gray-800");
   
     /* -------------------------------------------------- JSX */
     return (
       <>
         <div className="bg-white rounded-lg shadow-md p-6">
           <h2 className="text-xl font-semibold mb-6">خرید گروهی</h2>
           {loading ? (
             <div className="text-center py-8">در حال بارگذاری...</div>
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
                     <th className="px-6 py-3">تاریخ ایجاد</th>
                     <th className="px-6 py-3">انقضاء</th>
                     <th className="px-6 py-3">عملیات</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {groupBuys.map((g) => (
                     <tr key={g.id} className="hover:bg-gray-50">
                       <td className="px-6 py-4">#{g.id}</td>
                       <td className="px-6 py-4">{g.product_name}</td>
                       <td className="px-6 py-4">
                         <div>{g.creator_name}</div>
                         <div className="text-sm text-gray-500">{g.creator_phone}</div>
                       </td>
                       <td className="px-6 py-4">
                         <code className="bg-gray-100 px-2 py-1 rounded">{g.invite_code}</code>
                       </td>
                       <td className="px-6 py-4">{g.participants_count} نفر</td>
                       <td className="px-6 py-4">
                         <span
                           className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(
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
                           onClick={() => fetchGroupBuyDetails(g.id)}
                           className="text-blue-600 hover:text-blue-900"
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
   
         {showDetailsModal && selectedGroupBuy && (
           <GroupBuyDetailsModal
             data={selectedGroupBuy}
             close={() => setShowDetailsModal(false)}
           />
         )}
       </>
     );
   }
   
   /* --------------------------------------------------------------------------
      Group‑buy details modal
      -------------------------------------------------------------------------- */
   
   function GroupBuyDetailsModal({
     data,
     close,
   }: {
     data: any;
     close: () => void;
   }) {
     const color = (s: string) =>
       ({
         completed: "bg-green-100 text-green-800",
         active: "bg-blue-100 text-blue-800",
         pending: "bg-yellow-100 text-yellow-800",
         expired: "bg-red-100 text-red-800",
         /* persian */
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
               <h2 className="text-2xl font-bold">جزئیات خرید گروهی #{data.id}</h2>
               <button onClick={close} className="text-gray-500 hover:text-gray-700">
                 <FaTimes size={24} />
               </button>
             </div>
   
             {/* info */}
             <div className="grid md:grid-cols-2 gap-6 mb-6">
               <div>
                 <h3 className="font-semibold mb-3">اطلاعات ایجادکننده</h3>
                 <div className="bg-gray-50 p-4 rounded">
                   <p><strong>نام:</strong> {data.creator_name}</p>
                   <p><strong>تلفن:</strong> {data.creator_phone}</p>
                   {data.creator_email && <p><strong>ایمیل:</strong> {data.creator_email}</p>}
                 </div>
               </div>
               <div>
                 <h3 className="font-semibold mb-3">اطلاعات خرید گروهی</h3>
                 <div className="bg-gray-50 p-4 rounded">
                   <p><strong>محصول:</strong> {data.product_name}</p>
                   <p><strong>کد دعوت:</strong> <code className="bg-gray-200 px-2 py-1 rounded">{data.invite_code}</code></p>
                   <p><strong>وضعیت:</strong>
                     <span className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${color(data.status)}`}>{data.status}</span>
                   </p>
                   <p><strong>تاریخ ایجاد:</strong> {new Date(data.created_at).toLocaleString("fa-IR")}</p>
                   <p><strong>تاریخ انقضاء:</strong> {new Date(data.expires_at).toLocaleString("fa-IR")}</p>
                 </div>
               </div>
             </div>
   
             {/* participants */}
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
                     <th className="px-6 py-3">تاریخ پیوستن</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {data.participants?.map((p: any) => (
                     <tr key={p.id}>
                       <td className="px-6 py-4">{p.user_name}</td>
                       <td className="px-6 py-4">{p.user_phone}</td>
                       <td className="px-6 py-4">{p.user_email ?? "N/A"}</td>
                       <td className="px-6 py-4">{new Date(p.joined_at).toLocaleString("fa-IR")}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
   
             <div className="mt-6 flex justify-end">
               <button onClick={close} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
                 بستن
               </button>
             </div>
           </div>
         </div>
       </div>
     );
   }
   