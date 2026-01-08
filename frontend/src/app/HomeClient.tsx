'use client';

import { useState, useEffect } from 'react';

import Header from '@/components/Header';
import CartBar from '@/components/CartBar';
import { HomeCtx } from '@/contexts/HomeContext';

import Slider from '@/components/Slider';
import ProductGrid from '@/components/ProductGrid';
import { useAuth } from '@/contexts/AuthContext';
import { isTelegramMiniApp } from '@/utils/linkGenerator';
import { safeStorage } from '@/utils/safeStorage';

type Banner = {
  id: number | string;
  image_url: string;
  title?: string | null;
  description?: string | null;
};

type HomeClientProps = {
  initialProductsRaw?: any[];
  initialBanners?: Banner[];
};

export default function HomeClient({ initialProductsRaw = [], initialBanners = [] }: HomeClientProps) {
  const [cat, setCat] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');
  const [welcomeSheetOpen, setWelcomeSheetOpen] = useState(false);
  const { isAuthenticated, loading } = useAuth();

  // Show welcome bottom sheet for non-logged users or first-time Telegram users
  useEffect(() => {
    if (loading) return; // Wait for auth to load

    const WELCOME_SHEET_KEY = 'home_welcome_sheet_shown';
    const hasSeenWelcomeSheet = safeStorage.getItem(WELCOME_SHEET_KEY) === 'true';

    // Check if user should see the welcome sheet
    const isTelegram = isTelegramMiniApp();
    const shouldShow = !isAuthenticated || (isTelegram && !hasSeenWelcomeSheet);

    if (shouldShow && !hasSeenWelcomeSheet) {
      // Show after 2 seconds
      const timer = setTimeout(() => {
        setWelcomeSheetOpen(true);
        // Mark as shown
        safeStorage.setItem(WELCOME_SHEET_KEY, 'true');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loading]);

  const closeWelcomeSheet = () => {
    setWelcomeSheetOpen(false);
  };

  return (
      <HomeCtx.Provider value={{ cat, setCat, search, setSearch }}>
        <Header />

        {/* Banner temporarily hidden */}
        {/* <Slider initialBanners={initialBanners} /> */}

        <ProductGrid cat={cat} initialProductsRaw={initialProductsRaw} />

        <CartBar />

        {/* Welcome Bottom Sheet */}
        {welcomeSheetOpen && (
          <>
            <div 
              className="welcome-sheet-overlay" 
              onClick={closeWelcomeSheet}
            />
            <div className="welcome-bottom-sheet">
              <button className="welcome-sheet-close" onClick={closeWelcomeSheet}>×</button>
              <div className="welcome-sheet-handle" />
              <div className="welcome-sheet-content">
                <div className="welcome-sheet-icon">🎁</div>
                <h3 className="welcome-sheet-title">به باهم خوش اومدی!</h3>
                <p className="welcome-sheet-desc">
                  توی باهم می‌تونی با دوستات خرید کنی و تا <strong>۱۰۰٪ تخفیف</strong> بگیری!
                  <br />
                  هر چی دوستای بیشتری دعوت کنی، تخفیف بیشتری می‌گیری.
                </p>
                <button className="welcome-sheet-btn" onClick={closeWelcomeSheet}>
                  متوجه شدم، بزن بریم!
                </button>
              </div>
            </div>
          </>
        )}

        <style jsx>{`
          .welcome-sheet-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            opacity: 1;
            transition: opacity 0.3s ease;
          }
          .welcome-bottom-sheet {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            background: #fff;
            border-top-left-radius: 28px;
            border-top-right-radius: 28px;
            max-height: 70vh;
            z-index: 10000;
            box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.18);
            animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
          .welcome-sheet-close {
            position: absolute;
            top: 12px;
            right: 16px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.06);
            border: none;
            font-size: 1.5rem;
            color: #666;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 10;
            line-height: 1;
            padding: 0;
            font-weight: 300;
          }
          .welcome-sheet-close:hover {
            background: rgba(227, 28, 95, 0.1);
            color: #e31c5f;
          }
          .welcome-sheet-handle {
            width: 48px;
            height: 5px;
            background: linear-gradient(90deg, #ddd, #ccc, #ddd);
            border-radius: 4px;
            margin: 12px auto 8px;
          }
          .welcome-sheet-content {
            padding: 20px 24px 40px;
            text-align: center;
            direction: rtl;
          }
          .welcome-sheet-icon {
            font-size: 3.5rem;
            margin-bottom: 16px;
            animation: bounce 1s ease infinite;
          }
          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-8px);
            }
          }
          .welcome-sheet-title {
            font-size: 1.4rem;
            font-weight: 800;
            color: #333;
            margin: 0 0 16px;
            line-height: 1.5;
          }
          .welcome-sheet-desc {
            font-size: 1rem;
            font-weight: 400;
            color: #555;
            line-height: 2;
            margin: 0 0 28px;
            max-width: 320px;
            margin-left: auto;
            margin-right: auto;
          }
          .welcome-sheet-desc strong {
            color: #e31c5f;
            font-weight: 700;
          }
          .welcome-sheet-btn {
            width: 100%;
            max-width: 280px;
            background: linear-gradient(135deg, #e31c5f 0%, #c41850 100%);
            color: #fff;
            border: none;
            border-radius: 16px;
            padding: 16px 24px;
            font-size: 1.05rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 6px 20px rgba(227, 28, 95, 0.35);
          }
          .welcome-sheet-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(227, 28, 95, 0.45);
          }
          .welcome-sheet-btn:active {
            transform: translateY(0);
          }
        `}</style>
      </HomeCtx.Provider>
  );
}


