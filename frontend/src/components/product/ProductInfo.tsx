import { Button } from '@heroui/react';
import { useState, useEffect } from 'react';
import { AiFillHeart, AiFillStar, AiOutlineHeart } from 'react-icons/ai';
import CustomModal from '../common/CustomModal';
import { addToFavorites, isProductInFavorites, removeFromFavorites } from '@/services/favoriteService';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Product type definition matching the API response
type ProductDetail = {
    id: number;
    name: string;
    description: string;
    base_price: number;
    discount_price: number | null;
    discount: number | null;
    shipping_cost: number;
    category: string;
    category_slug: string | null;
    subcategory: string | null;
    subcategory_slug: string | null;
    image: string;
    images: string[];
    in_stock: boolean;
    group_buy_options: {
        twoPersonPrice: number;
        fourPersonPrice: number;
    };
    store_id: number;
    store_name: string;
};

interface ProductInfoProps {
    showGroupBuyText?: boolean; // Control the display of the group buy text
    showPrices?: boolean; // Control the display of the price section
    product?: ProductDetail; // Product data from API
}

export default function ProductInfo({ 
    showGroupBuyText = false, 
    showPrices = false,
    product 
}: ProductInfoProps) {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const [liked, setLiked] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
    const [loading, setLoading] = useState(false);
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const router = useRouter();

    // Default rating if not provided (to be replaced with actual reviews data)
    const rating = 4;

    // Check if product is in favorites on mount
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            if (authLoading) return; // Wait until auth state is determined
            if (!isAuthenticated || !product?.id) return;
            
            try {
                setLoading(true);
                const isFavorite = await isProductInFavorites(product.id);
                setLiked(isFavorite);
            } catch (error) {
                console.error('Error checking favorite status:', error);
            } finally {
                setLoading(false);
            }
        };
        
        checkFavoriteStatus();
    }, [product?.id, isAuthenticated, authLoading]);

    // Handle adding/removing favorites
    const handleFavoriteToggle = async () => {
        if (authLoading) return; // Don't do anything while auth is loading
        
        if (!isAuthenticated || !product?.id) {
            // Show login prompt
            setShowAuthPrompt(true);
            return;
        }
        
        try {
            setLoading(true);
            
            if (liked) {
                // Remove from favorites
                const success = await removeFromFavorites(product.id);
                if (success) {
                    setLiked(false);
                }
            } else {
                // Add to favorites
                const success = await addToFavorites(product.id);
                if (success) {
                    setLiked(true);
                }
            }
        } catch (error) {
            console.error('Error toggling favorite status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = () => {
        setShowAuthPrompt(false);
        router.push('/auth/login');
    };

    return (
        <div className="px-4 py-1">
            {/* Authentication prompt modal */}
            <CustomModal
                isOpen={showAuthPrompt}
                onClose={() => setShowAuthPrompt(false)}
                title="ورود به حساب کاربری"
                submitLabel="ورود"
                onSubmit={handleLogin}
                cancelLabel="انصراف"
            >
                <p className="text-center mb-4">
                    برای افزودن محصول به علاقه‌مندی‌ها، لطفا وارد حساب کاربری خود شوید.
                </p>
            </CustomModal>
            
            {showPrices && ( // Conditionally render the price section
                <div className='flex items-center gap-5 text-sm py-4'>
                    <p className='line-through'>
                        {product?.base_price?.toLocaleString('fa-IR') || "0"} <span className='text-[10px]'>تومان</span>
                    </p>
                    <p className='text-green-600'>
                        {product?.discount_price?.toLocaleString('fa-IR') || "0"} <span className='text-[10px]'>تومان</span>
                    </p>
                </div>
            )}
            <div className='pb-1'>
                <div className='flex items-center justify-between'>
                    <h1 className="text-xs font-bold text-gray-800 leading-6">
                        {product?.name || "شامپو تقویت کننده مو او جی ایکس مدل بیوتین"}
                    </h1>

                    <div>
                        <Button
                            className="p-2 flex items-center flex-col rounded-none h-full min-w-max bg-transparent"
                            onClick={handleFavoriteToggle}
                            disabled={loading || authLoading}
                        >
                            {liked ? (
                                <AiFillHeart size={24} className={`text-red-600 ${loading ? 'opacity-50' : ''}`} />
                            ) : (
                                <AiOutlineHeart size={24} className={`text-gray-600 ${loading ? 'opacity-50' : ''}`} />
                            )}
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-xs">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <AiFillStar
                            key={star}
                            className={`${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        />
                    ))}
                    <span className="text-xs text-gray-500 mr-1">{rating}</span>
                    <div className='mr-3'>
                        (211 نظر)
                    </div>
                </div>
            </div>
            <div className='text-xs border-t-2 '>
                {showGroupBuyText && ( // Conditionally render the group buy text
                    <>
                        <p className='text-green-600 text-center font-bold mt-3'>
                            بعد از خرید, گروه خودت رو تشکیل بده و کل پرداختیت رو پس بگیر !
                        </p>
                        <p className='text-left mt-1' onClick={() => setIsModalOpen(true)}>اطلاعات بیشتر</p>
                    </>
                )}
            </div>

            <CustomModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="اطلاعات بیشتر"
                cancelLabel="بستن"
            >
                <p>اینجا می‌توانید اطلاعات بیشتری درباره محصول و نحوه خرید گروهی پیدا کنید.</p>
            </CustomModal>
        </div>
    )
}