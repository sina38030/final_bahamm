"use client";

import { useState, useEffect } from 'react';

interface AdminStats {
    total_users: number;
    total_products: number;
    total_orders: number;
    total_categories: number;
    recent_orders: number;
    total_revenue: number;
}

export default function SimpleAdminPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            console.log('Fetching admin stats...');
            
            const response = await fetch('http://localhost:8002/admin/dashboard');
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Data received:', data);
                setStats(data);
                setError(null);
            } else {
                setError(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <h3 className="font-bold">Error:</h3>
                        <p>{error}</p>
                    </div>
                    <button 
                        onClick={fetchStats}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">🎯 Simple Admin Dashboard</h1>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">👥 Total Users</h3>
                        <p className="text-3xl font-bold text-blue-600">{stats?.total_users || 0}</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">📦 Total Products</h3>
                        <p className="text-3xl font-bold text-green-600">{stats?.total_products || 0}</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">�� Total Orders</h3>
                        <p className="text-3xl font-bold text-purple-600">{stats?.total_orders || 0}</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">📂 Categories</h3>
                        <p className="text-3xl font-bold text-orange-600">{stats?.total_categories || 0}</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">🔄 Recent Orders</h3>
                        <p className="text-3xl font-bold text-red-600">{stats?.recent_orders || 0}</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">💰 Total Revenue</h3>
                        <p className="text-3xl font-bold text-yellow-600">{stats?.total_revenue || 0} تومان</p>
                    </div>
                </div>

                {/* Raw Data Display */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">📊 Raw API Data</h2>
                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                        {JSON.stringify(stats, null, 2)}
                    </pre>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">⚡ Quick Actions</h2>
                    <div className="space-y-4">
                        <button 
                            onClick={fetchStats}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
                        >
                            🔄 Refresh Stats
                        </button>
                        
                        <button 
                            onClick={() => window.open('http://localhost:8002/admin/dashboard', '_blank')}
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-4"
                        >
                            🔗 Open API Direct
                        </button>
                        
                        <button 
                            onClick={() => window.location.href = '/'}
                            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                        >
                            🏠 Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 