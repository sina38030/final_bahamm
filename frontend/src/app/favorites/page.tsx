'use client';

import React, { useState, useEffect } from 'react';
import PrevPage from '@/components/common/PrevPage';
import { FaPlus } from 'react-icons/fa';
import Image from 'next/image';
import BasketModal from '@/components/modals/BasketModal';
import { Button } from '@heroui/react';
import { useAuth } from '@/contexts/AuthContext';
import { FavoriteProduct, getUserFavorites, removeFromFavorites } from '@/services/favoriteService';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function FavoritesPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
    const [isBasketModalOpen, setIsBasketModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch favorites from API
    useEffect(() => {
        const fetchFavorites = async () => {
            // Only fetch favorites after auth is loaded and user is authenticated
            if (authLoading) return;
            if (!isAuthenticated) {
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                console.log('[DEBUG] Calling getUserFavorites service function');
                
                const userFavorites = await getUserFavorites();
                console.log('[DEBUG] getUserFavorites returned:', userFavorites);
                
                if (userFavorites.length > 0) {
                    console.log('[DEBUG] Received non-empty favorites array:', 
                        userFavorites.map(f => `ID: ${f.id}, Name: ${f.name}`));
                } else {
                    console.log('[DEBUG] Received empty favorites array');
                }
                
                setFavorites(userFavorites);
                console.log('[DEBUG] State updated with favorites:', userFavorites.length);
                
            } catch (error) {
                console.error('[DEBUG] Unexpected error in fetchFavorites:', error);
                setError('Failed to load favorites. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchFavorites();
    }, [isAuthenticated, authLoading]);

    const formatPrice = (price: number) => {
        return price.toLocaleString('fa-IR');
    };

    const handleAddToCart = (productId: number) => {
        // اینجا باید منطق اضافه کردن به سبد خرید پیاده‌سازی شود
        console.log('Add to cart:', productId);
        setIsBasketModalOpen(true);
    };

    // Remove from favorites
    const handleRemoveFromFavorites = async (productId: number) => {
        try {
            console.log(`[DEBUG] Removing product ${productId} from favorites`);
            
            // Optimistically update UI first
            setFavorites(favorites.filter(item => item.id !== productId));
            
            // Then call API through service
            const success = await removeFromFavorites(productId);
            
            if (!success) {
                console.error('[DEBUG] Failed to remove from favorites');
            } else {
                console.log('[DEBUG] Successfully removed product from favorites');
            }
        } catch (error) {
            console.error('[DEBUG] Error removing from favorites:', error);
        }
    };

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center py-12">
            <div className="w-48 h-48 relative mb-6">
                <Image
                    src="/images/empty-favorites.svg"
                    alt="علاقه‌مندی خالی"
                    fill
                    className="object-contain"
                />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
                لیست علاقه‌مندی‌های شما خالی است
            </h3>
            <p className="text-gray-500 text-center">
                محصولات مورد علاقه خود را برای خرید بعدی ذخیره کنید
            </p>
        </div>
    );

    const ProductCard = ({ product }: { product: FavoriteProduct }) => (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative h-48 w-full">
                {product.image && (
                    <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover w-full h-full"
                    />
                )}
                <button 
                    className="absolute top-2 left-2 p-1 bg-white rounded-full shadow-sm z-[5]"
                    onClick={() => handleRemoveFromFavorites(product.id)}
                >
                    <FaPlus className="transform rotate-45 text-red-500" size={16} />
                </button>
            </div>
            <div className="p-4">
                <h3 className="font-medium text-xs text-gray-900 mb-2 line-clamp-2 ">
                    {product.name}
                </h3>
                <div className="flex items-center justify-between text-xs">
                    <div>
                        <p className="text-xs text-gray-600 mb-1">قیمت مخصوص گروه ۲ نفره:</p>
                        <p className="text-base font-bold text-primary">
                            {formatPrice(product.group_price || product.price)}
                        </p>
                    </div>
                    <Button
                        onClick={() => handleAddToCart(product.id)}
                        className="size-5 bg-primary p-0 min-w-fit min-h-fit text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors z-[5]"
                    >
                        <FaPlus size={10} />
                    </Button>
                </div>
            </div>
        </div>
    );

    if (!isAuthenticated && !authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <PrevPage title="علاقه‌مندی‌ها" />
                <div className="mt-6 text-center">
                    <p className="text-gray-600 mb-4">برای مشاهده علاقه‌مندی‌ها لطفا وارد حساب کاربری خود شوید</p>
                    <Button 
                        onPress={() => window.location.href = '/auth/login'}
                        className="bg-primary text-white px-4 py-2 rounded-lg"
                    >
                        ورود به حساب کاربری
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PrevPage title="علاقه‌مندی‌ها" />
            
            <div className="p-4">
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-center">
                        {error}
                    </div>
                ) : favorites.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {favorites.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
            
            <BasketModal isOpen={isBasketModalOpen} onClose={() => setIsBasketModalOpen(false)} />
        </div>
    );
} 