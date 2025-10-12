'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { API_BASE_URL } from '@/utils/api';

// Define types for backend data
type Product = {
    id: number;
    name: string;
    image: string | null;
    price: number;
    discount_price?: number | null;
    discount?: number | null;
    free_shipping?: boolean;
    category_slug?: string | null;
};

type Category = {
    id: number;
    name: string;
    slug: string;
    image_url: string | null;
};

type SubCategory = {
    id: number;
    name: string;
    slug: string;
    image_url: string | null;
    category_id: number;
};

type SearchProduct = Product & {
    categoryId: number;
    categoryName: string;
};

type SearchResults = {
    products: SearchProduct[];
    isSearching: boolean;
};

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
    const [categoryProducts, setCategoryProducts] = useState<{[categoryId: number]: Product[]}>({});
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [sidebarSearchTerm, setSidebarSearchTerm] = useState('');
    const [mainSearchTerm, setMainSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchResults, setSearchResults] = useState<SearchResults>({
        products: [],
        isSearching: false
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all categories when component mounts
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/categories`);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch categories: ${response.status}`);
                }
                
                const data = await response.json();
                setCategories(data);
                
                // Set first category as selected if available
                if (data.length > 0) {
                    setSelectedCategory(data[0]);
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Error fetching categories:', error);
                setError('Failed to load categories. Please try again later.');
                setLoading(false);
            }
        };
        
        fetchCategories();
    }, []);

    // Fetch subcategories for selected category
    useEffect(() => {
        if (!selectedCategory) return;
        
        const fetchSubcategories = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/categories/${selectedCategory.slug}/subcategories`);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch subcategories: ${response.status}`);
                }
                
                const data = await response.json();
                setSubcategories(data);
                setLoading(false);
            } catch (error) {
                console.error(`Error fetching subcategories for category ${selectedCategory.name}:`, error);
                setError('Failed to load subcategories. Please try again later.');
                setLoading(false);
            }
        };
        
        fetchSubcategories();
    }, [selectedCategory]);

    const handleCategorySelect = (category: Category) => {
        setSelectedCategory(category);
        setSearchResults({ products: [], isSearching: false });
        setMainSearchTerm('');
    };

    // Filter categories based on sidebar search term
    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(sidebarSearchTerm.toLowerCase())
    );

    // Filter subcategories based on main search term
    const filteredSubcategories = mainSearchTerm.trim() === '' 
        ? subcategories 
        : subcategories.filter(subcat => 
            subcat.name.toLowerCase().includes(mainSearchTerm.toLowerCase())
          );

    // Handle main search input change
    const handleMainSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMainSearchTerm(value);
    };

    // Handle sidebar search input change
    const handleSidebarSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSidebarSearchTerm(e.target.value);
    };

    // Clear search
    const clearSearch = () => {
        setMainSearchTerm('');
        setSearchResults({ products: [], isSearching: false });
    };

    if (loading && categories.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500">Loading categories...</p>
                </div>
            </div>
        );
    }

    if (error && categories.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500">{error}</p>
                    <button 
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 relative">
            <div className="flex min-h-screen ">
                {/* Fixed Sidebar */}
                <div className="w-24 bg-white h-screen sticky top-0 shadow-md overflow-hidden flex-shrink-0">
                    <div className="p-2">
                        <input
                            type="text"
                            placeholder="جستجو..."
                            className="w-full p-2 text-sm rounded border text-right"
                            value={sidebarSearchTerm}
                            onChange={handleSidebarSearchChange}
                        />
                    </div>
                    <ul className="overflow-y-auto h-full px-2">
                        {filteredCategories.map((category) => (
                            <li
                                key={category.id}
                                className={`p-2 my-1 rounded-lg cursor-pointer transition-all duration-200 text-sm flex items-center ${selectedCategory?.id === category.id ? 'bg-primary/10 text-primary font-medium shadow-sm' : 'hover:bg-gray-50'}`}
                                onClick={() => handleCategorySelect(category)}
                            >
                                <span>{category.name}</span>
                            </li>
                        ))}
                        {filteredCategories.length === 0 && (
                            <li className="p-3 text-center text-gray-500">
                                دسته‌بندی با این نام یافت نشد
                            </li>
                        )}
                    </ul>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-h-screen">
                    {/* Header with Search Bar */}
                    <div className="p-4 bg-gray-200 sticky top-0 z-10">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="جستجو در زیردسته‌ها..."
                                className="w-full p-3 pr-10 rounded-lg text-right shadow-sm"
                                value={mainSearchTerm}
                                onChange={handleMainSearchChange}
                            />
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                {mainSearchTerm ? (
                                    <FaTimes className="cursor-pointer" onClick={clearSearch} />
                                ) : (
                                    <FaSearch />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Regular Content */}
                    {selectedCategory && (
                        <>
                            {/* Selected Category Title */}
                            <div className="p-4 bg-white shadow-sm">
                                <h1 className="text-xl font-bold text-gray-800">{selectedCategory.name}</h1>
                            </div>

                            {/* Subcategories Grid */}
                            <div className="p-4">
                                {loading ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">Loading subcategories...</p>
                                    </div>
                                ) : filteredSubcategories.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-4">
                                        {filteredSubcategories.map((subcategory) => (
                                            <Link 
                                                href={`/products/${subcategory.slug}`} 
                                                key={subcategory.id} 
                                                className="flex flex-col items-center"
                                            >
                                                <div className="w-32 h-32 rounded-full flex items-center justify-center mb-2 overflow-hidden">
                                                    {subcategory.image_url ? (
                                                        <Image
                                                            src={subcategory.image_url}
                                                            alt={subcategory.name}
                                                            width={80}
                                                            height={80}
                                                            className="rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                                                            <span className="text-xs text-gray-500">تصویر</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-sm text-center font-medium">{subcategory.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">زیردسته‌ای یافت نشد</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Categories Grid (Shown when no category is selected) */}
                    {!selectedCategory && (
                        <div className="p-4">
                            <div className="grid grid-cols-3 gap-4">
                                {categories.map((category) => (
                                    <div 
                                        key={category.id} 
                                        onClick={() => handleCategorySelect(category)}
                                        className="flex flex-col items-center cursor-pointer"
                                    >
                                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                                            {category.image_url ? (
                                                <Image
                                                    src={category.image_url}
                                                    alt={category.name}
                                                    width={80}
                                                    height={80}
                                                    className="rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
                                            )}
                                        </div>
                                        <span className="text-sm text-center">{category.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            
        </div>
    );
} 