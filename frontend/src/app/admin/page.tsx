"use client";

import { useState, useEffect } from 'react';
import { 
    FaTachometerAlt, 
    FaBoxes, 
    FaTags, 
    FaShoppingCart, 
    FaUsers,
    FaBars,
    FaTimes,
    FaEye
} from 'react-icons/fa';
import { API_BASE_URL } from '@/utils/api';

type Section = 'dashboard' | 'products' | 'categories' | 'orders' | 'users';

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

export default function AdminPage() {
    const [activeSection, setActiveSection] = useState<Section>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(false);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

    // Fetch dashboard stats
    useEffect(() => {
        if (activeSection === 'dashboard') {
            fetchDashboardStats();
        }
    }, [activeSection]);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setDashboardStats(data);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const menuItems = [
        { id: 'dashboard' as Section, label: 'داشبورد', icon: FaTachometerAlt },
        { id: 'products' as Section, label: 'محصولات', icon: FaBoxes },
        { id: 'categories' as Section, label: 'دسته‌بندی‌ها', icon: FaTags },
        { id: 'orders' as Section, label: 'سفارشات', icon: FaShoppingCart },
        { id: 'users' as Section, label: 'کاربران', icon: FaUsers },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'dashboard':
                return <DashboardContent stats={dashboardStats} loading={loading} />;
            case 'products':
                return <ProductsContent />;
            case 'categories':
                return <CategoriesContent />;
            case 'orders':
                return <OrdersContent />;
            case 'users':
                return <UsersContent />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100" style={{ direction: 'rtl' }}>
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-blue-600 text-white overflow-hidden`}>
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
                                            ? 'bg-blue-700' 
                                            : 'hover:bg-blue-500'
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
                        {menuItems.find(item => item.id === activeSection)?.label}
                    </h1>
                </div>

                {/* Content Area */}
                <div className="p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

// Dashboard Content Component
function DashboardContent({ stats, loading }: { stats: DashboardStats | null; loading: boolean }) {
    if (loading) {
        return <div className="text-center py-8">در حال بارگذاری...</div>;
    }

    if (!stats) {
        return <div className="text-center py-8">خطا در دریافت اطلاعات</div>;
    }

    const cards = [
        { title: 'کل کاربران', value: stats.total_users, color: 'bg-blue-500' },
        { title: 'کل محصولات', value: stats.total_products, color: 'bg-green-500' },
        { title: 'کل سفارشات', value: stats.total_orders, color: 'bg-yellow-500' },
        { title: 'کل دسته‌بندی‌ها', value: stats.total_categories, color: 'bg-purple-500' },
        { title: 'سفارشات اخیر (7 روز)', value: stats.recent_orders, color: 'bg-red-500' },
        { title: 'درآمد کل', value: `${stats.total_revenue.toLocaleString()} تومان`, color: 'bg-indigo-500' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6">
                    <div className={`w-12 h-12 ${card.color} rounded-lg mb-4`}></div>
                    <h3 className="text-gray-600 text-sm mb-2">{card.title}</h3>
                    <p className="text-2xl font-bold">{card.value}</p>
                </div>
            ))}
        </div>
    );
}

// Products Content Component
function ProductsContent() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [adding, setAdding] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        base_price: '',
        market_price: '',
        shipping_cost: '',
        category_id: ''
    });
    const [mainImage, setMainImage] = useState<File | null>(null);
    const [images, setImages] = useState<FileList | null>(null);

    useEffect(() => {
        fetchProducts();
    }, [search]);

    useEffect(() => {
        if (showAddModal) {
            fetchCategories();
        }
    }, [showAddModal]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/admin/products?search=${search}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/categories`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleDelete = async (productId: number) => {
        if (!confirm('آیا از حذف این محصول اطمینان دارید؟')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                fetchProducts();
            }
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    const handleAddProduct = async () => {
        try {
            setAdding(true);
            const formData = new FormData();
            formData.append('name', newProduct.name);
            formData.append('description', newProduct.description);
            formData.append('base_price', newProduct.base_price);
            formData.append('market_price', newProduct.market_price);
            formData.append('shipping_cost', newProduct.shipping_cost);
            formData.append('category_id', newProduct.category_id);
            if (mainImage) {
                formData.append('main_image', mainImage);
            }
            if (images) {
                Array.from(images).forEach((file) => {
                    formData.append('images[]', file);
                });
            }

            const response = await fetch(`${API_BASE_URL}/admin/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: formData
            });

            if (response.ok) {
                fetchProducts();
                setShowAddModal(false);
                setNewProduct({
                    name: '',
                    description: '',
                    base_price: '',
                    market_price: '',
                    shipping_cost: '',
                    category_id: ''
                });
                setMainImage(null);
                setImages(null);
            }
        } catch (error) {
            console.error('Error adding product:', error);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <input
                    type="text"
                    placeholder="جستجو محصولات..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2 border rounded-lg"
                />
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                    افزودن محصول
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">در حال بارگذاری...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تصویر</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">دسته‌بندی</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">قیمت پایه</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">قیمت بازار</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {products.map((product) => (
                                <tr key={product.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {product.main_image && (
                                            <img src={product.main_image} alt={product.name} className="w-12 h-12 object-cover rounded" />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{product.category_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{product.base_price.toLocaleString()} تومان</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{product.market_price.toLocaleString()} تومان</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleDelete(product.id)}
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
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">افزودن محصول جدید</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                                <FaTimes size={24} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <input
                                type="text"
                                placeholder="نام محصول"
                                value={newProduct.name}
                                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                className="border rounded p-2"
                            />
                            <textarea
                                placeholder="توضیحات"
                                value={newProduct.description}
                                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                className="border rounded p-2"
                            />
                            <input
                                type="number"
                                placeholder="قیمت پایه"
                                value={newProduct.base_price}
                                onChange={(e) => setNewProduct({ ...newProduct, base_price: e.target.value })}
                                className="border rounded p-2"
                            />
                            <input
                                type="number"
                                placeholder="قیمت بازار"
                                value={newProduct.market_price}
                                onChange={(e) => setNewProduct({ ...newProduct, market_price: e.target.value })}
                                className="border rounded p-2"
                            />
                            <input
                                type="number"
                                placeholder="هزینه ارسال"
                                value={newProduct.shipping_cost}
                                onChange={(e) => setNewProduct({ ...newProduct, shipping_cost: e.target.value })}
                                className="border rounded p-2"
                            />
                            <select
                                value={newProduct.category_id}
                                onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                                className="border rounded p-2"
                            >
                                <option value="">انتخاب دسته‌بندی</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                            <input type="file" onChange={(e) => setMainImage(e.target.files ? e.target.files[0] : null)} />
                            <input type="file" multiple onChange={(e) => setImages(e.target.files)} />
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setShowAddModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded ml-2">
                                انصراف
                            </button>
                            <button onClick={handleAddProduct} className="bg-blue-600 text-white px-4 py-2 rounded" disabled={adding}>
                                {adding ? 'در حال افزودن...' : 'افزودن'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Categories Content Component
function CategoriesContent() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/admin/categories`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">دسته‌بندی‌ها</h2>
            {loading ? (
                <div className="text-center py-8">در حال بارگذاری...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => (
                        <div key={category.id} className="border rounded-lg p-4">
                            <h3 className="font-semibold">{category.name}</h3>
                            <p className="text-sm text-gray-600">{category.slug}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Orders Content Component
function OrdersContent() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/admin/orders`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setOrders(data);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderDetails = async (orderId: number) => {
        try {
            setLoadingDetails(true);
            const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedOrder(data);
                setShowDetailsModal(true);
            }
        } catch (error) {
            console.error('Error fetching order details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const updateOrderStatus = async (orderId: number, status: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                fetchOrders();
                if (selectedOrder && selectedOrder.id === orderId) {
                    setSelectedOrder({ ...selectedOrder, status });
                }
            }
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'processing':
                return 'bg-blue-100 text-blue-800';
            case 'shipped':
                return 'bg-purple-100 text-purple-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending':
                return 'در انتظار';
            case 'processing':
                return 'در حال پردازش';
            case 'shipped':
                return 'ارسال شده';
            case 'completed':
                return 'تکمیل شده';
            case 'cancelled':
                return 'لغو شده';
            default:
                return status;
        }
    };

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
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره سفارش</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کاربر</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مبلغ</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">#{order.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div>{order.user_name}</div>
                                                <div className="text-sm text-gray-500">{order.user_phone}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{order.total_amount.toLocaleString()} تومان</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                {getStatusLabel(order.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(order.created_at).toLocaleDateString('fa-IR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => fetchOrderDetails(order.id)}
                                                className="text-blue-600 hover:text-blue-900 ml-3"
                                                disabled={loadingDetails}
                                            >
                                                <FaEye />
                                            </button>
                                            <select
                                                onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                                className="text-sm border rounded px-2 py-1"
                                                defaultValue={order.status}
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

            {/* Order Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">جزئیات سفارش #{selectedOrder.id}</h2>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <FaTimes size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">اطلاعات کاربر</h3>
                                    <div className="bg-gray-50 p-4 rounded">
                                        <p><strong>نام:</strong> {selectedOrder.user_name}</p>
                                        <p><strong>تلفن:</strong> {selectedOrder.user_phone}</p>
                                        {selectedOrder.user_email && (
                                            <p><strong>ایمیل:</strong> {selectedOrder.user_email}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">اطلاعات سفارش</h3>
                                    <div className="bg-gray-50 p-4 rounded">
                                        <p><strong>وضعیت:</strong> 
                                            <span className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                                                {getStatusLabel(selectedOrder.status)}
                                            </span>
                                        </p>
                                        <p><strong>تاریخ ثبت:</strong> {new Date(selectedOrder.created_at).toLocaleString('fa-IR')}</p>
                                        <p><strong>مبلغ کل:</strong> {selectedOrder.total_amount.toLocaleString()} تومان</p>
                                        {selectedOrder.payment_method && (
                                            <p><strong>روش پرداخت:</strong> {selectedOrder.payment_method}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {selectedOrder.shipping_address && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-3">آدرس ارسال</h3>
                                    <div className="bg-gray-50 p-4 rounded">
                                        <p>{selectedOrder.shipping_address}</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-lg font-semibold mb-3">اقلام سفارش</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محصول</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تعداد</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">قیمت واحد</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">قیمت کل</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selectedOrder.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">{item.product_name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{item.quantity}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{item.base_price.toLocaleString()} تومان</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{item.total_price.toLocaleString()} تومان</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50">
                                            <tr>
                                                <td colSpan={3} className="px-6 py-3 text-right font-semibold">جمع کل:</td>
                                                <td className="px-6 py-3 font-semibold">{selectedOrder.total_amount.toLocaleString()} تومان</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                                >
                                    بستن
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Users Content Component
function UsersContent() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchUsers();
    }, [search]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/admin/users?search=${search}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="جستجو کاربران..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2 border rounded-lg"
                />
            </div>

            {loading ? (
                <div className="text-center py-8">در حال بارگذاری...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ایمیل</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تلفن</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سکه‌ها</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ عضویت</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.email || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.phone_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            user.user_type === 'MERCHANT' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {user.user_type === 'MERCHANT' ? 'فروشنده' : 'مشتری'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.coins}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {new Date(user.created_at).toLocaleDateString('fa-IR')}
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