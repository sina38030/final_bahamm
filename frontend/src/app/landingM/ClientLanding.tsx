"use client";
import React, { useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus as faPlusSolid, faMinus as faMinusSolid, faStar, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { useProductModal } from '@/hooks/useProductModal';
import { generateInviteLink, generateShareUrl, extractInviteCode } from '@/utils/linkGenerator';

// Resilient dynamic import to auto-recover once from transient ChunkLoadError after HMR/build changes
async function safeImport<T>(importer: () => Promise<T>, key: string): Promise<T> {
  try {
    return await importer();
  } catch (err: any) {
    try {
      const isClient = typeof window !== 'undefined';
      const isChunkError = err?.name === 'ChunkLoadError' || /ChunkLoadError/.test(String(err));
      if (isClient && isChunkError) {
        const onceKey = `once-reload-${key}`;
        if (!sessionStorage.getItem(onceKey)) {
          sessionStorage.setItem(onceKey, '1');
          window.location.reload();
        }
      }
    } catch {}
    throw err;
  }
}

const PhoneAuthModal = dynamic(() => safeImport(() => import('@/components/auth/PhoneAuthModal'), 'phone-auth-modal'), { ssr: false, loading: () => null });
const ProductModal = dynamic(() => safeImport(() => import('@/components/ProductModal'), 'product-modal'), { ssr: false, loading: () => null });

interface Product {
  name: string;
  category: string;
  weight: string;
  sales: string;
  stars: string;
  oldPrice: string;
  newPrice: string;
  img: string;
  priceValue: number;
}

interface SelectionProduct extends Product {
  id: number;
  product_id?: number;
}

export default function ClientLanding({ invite, initialProducts, initialGroupOrderData, initialGroupMeta, initialServerNowMs }: { invite: string; initialProducts?: any[]; initialGroupOrderData?: any; initialGroupMeta?: any; initialServerNowMs?: number }) {
  const router = useRouter();
  const [rotatingTextIndex, setRotatingTextIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [customCart, setCustomCart] = useState<Record<number, number>>({});
  const [totalItems, setTotalItems] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetContent, setSheetContent] = useState<{ title: string; body: React.ReactNode }>({ title: '', body: null });
  const [loadedProducts, setLoadedProducts] = useState(10);
  const [groupOrderData, setGroupOrderData] = useState<any>(initialGroupOrderData ?? null);
  const [loading, setLoading] = useState(false);
  const [productsData, setProductsData] = useState<any[]>(Array.isArray(initialProducts) ? initialProducts : []);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | 'leader' | 'custom'>(null);
  const [groupStatus, setGroupStatus] = useState<'ongoing' | 'success' | 'failed' | null>(null);
  const [disabledJoin, setDisabledJoin] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const initialExpiry = (() => {
    try {
      if (initialGroupMeta?.expiresAtMs != null) {
        const srvNow = Number(initialGroupMeta?.serverNowMs ?? initialServerNowMs ?? 0);
        if (Number.isFinite(srvNow) && srvNow > 0) {
          const clientNow = Date.now();
          const skew = clientNow - srvNow;
          return Number(initialGroupMeta.expiresAtMs) + skew;
        }
        return Number(initialGroupMeta.expiresAtMs);
      }
      if (initialGroupMeta?.remainingSeconds != null) return Date.now() + Number(initialGroupMeta.remainingSeconds) * 1000;
      if (initialGroupMeta?.expiresAt) {
        const parsed = Date.parse(String(initialGroupMeta.expiresAt));
        if (!Number.isNaN(parsed)) return parsed;
      }
    } catch {}
    return null;
  })();
  const [expiryMs, setExpiryMs] = useState<number | null>(initialExpiry);
  const { open: openProductModal } = useProductModal();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const closeSearch = () => { setIsSearchOpen(false); setSearchQuery(''); };

  const defaultTargetAmount = 150000;
  const rotatingMessages = ["مستقیم از مزرعه", "تازه و با کیفیت", "با هم بخریم، ارزان بخریم"];

  const toFaDigits = (s: string) => s.replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
  const toEnDigits = (s: string) => {
    const fa = "۰۱۲۳۴۵۶۷۸۹";
    return s.replace(/[۰-۹]/g, (d) => {
      const i = fa.indexOf(d);
      return i >= 0 ? String(i) : d;
    });
  };
  const faPrice = (n: number) => n.toLocaleString("fa-IR");
  const parseFaNumber = (s: string) => {
    const en = toEnDigits(String(s));
    const clean = en.replace(/[^\d.-]/g, '');
    const num = Number(clean);
    return Number.isFinite(num) ? num : 0;
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  const apiBase = API_BASE || (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production' ? 'http://localhost:8001' : '');
  const fetchJson = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} for ${url}: ${text.slice(0, 200)}`);
    }
    if (contentType.includes('application/json')) {
      return res.json();
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Expected JSON but got non-JSON response from ${url}: ${text.slice(0, 200)}`);
    }
  };
  const normalizePhone = (p?: string) => {
    if (!p) return '';
    let s = toEnDigits(String(p));
    s = s.replace(/[^\d]/g, '');
    if (s.startsWith('0098')) s = '0' + s.slice(4);
    else if (s.startsWith('+98')) s = '0' + s.slice(3);
    else if (s.startsWith('98')) s = '0' + s.slice(2);
    if (!s.startsWith('0') && s.length === 10) s = '0' + s;
    return s;
  };

  const getProductPrices = (productId: number) => {
    const pid = Number(productId);
    const product = productsData.find(p => Number(p.id) === pid);
    if (product) {
      return {
        solo_price: product.solo_price || 0,
        friend_1_price: product.friend_1_price || 0,
        friend_2_price: product.friend_2_price || 0,
        friend_3_price: product.friend_3_price || 0,
        market_price: product.market_price || 0,
        base_price: product.base_price || 0
      };
    }
    return { solo_price: 0, friend_1_price: 0, friend_2_price: 0, friend_3_price: 0, market_price: 0, base_price: 0 };
  };

  const formatWeight = (weightGrams?: number, tolGrams?: number) => {
    const w = Number(weightGrams || 0);
    const t = typeof tolGrams === 'number' ? Number(tolGrams) : undefined;
    const base = w < 1000 ? `${toFaDigits(String(w))} گرم` : `${toFaDigits((w / 1000).toFixed(1))} کیلوگرم`;
    if (t == null || isNaN(t)) return base;
    const tol = t < 1000 ? `${toFaDigits(String(t))} گرم` : `${toFaDigits((t / 1000).toFixed(1))} کیلوگرم`;
    return `${base} ± ${tol}`;
  };
  const formatRating = (r?: number) => toFaDigits(((Number(r || 0)).toFixed(1)));
  const formatSales  = (s?: number | string) => {
    const num = typeof s === 'number' ? Math.max(0, Math.floor(s)) : Math.max(0, parseInt(String(s || '').replace(/[^\d]/g, '')) || 0);
    const step = num < 10000 ? 100 : 1000;
    const rounded = Math.floor(num / step) * step;
    return `+${toFaDigits(String(rounded))}`;
  };

  const selectionProducts: SelectionProduct[] = useMemo(() => {
    if (!Array.isArray(productsData) || productsData.length === 0) return [];
    return productsData.map((bp: any) => {
      const solo = Number(bp.solo_price ?? bp.market_price ?? bp.base_price ?? 0) || 0;
      const friend1 = Number(bp.friend_1_price ?? solo) || solo;
      const categoryRaw = String(bp.category || '').toLowerCase();
      const mappedCat = categoryRaw.includes('میوه') ? 'fruit'
        : (categoryRaw.includes('سبزی') || categoryRaw.includes('صیفی')) ? 'veggie'
        : categoryRaw.includes('فصل') ? 'seasonal'
        : 'all';
      const imageUrl = Array.isArray(bp.images) && bp.images[0]
        ? bp.images[0]
        : (bp.image_url || '/images/placeholder-300.svg');
      return {
        id: Number(bp.id),
        product_id: Number(bp.id),
        name: String(bp.name || `محصول ${bp.id}`),
        category: mappedCat,
        weight: formatWeight(bp.weight_grams, bp.weight_tolerance_grams),
        sales: formatSales(bp.display_sales),
        stars: formatRating(bp.display_rating),
        oldPrice: toFaDigits(Math.round(solo).toLocaleString('fa-IR')),
        newPrice: toFaDigits(Math.round(friend1).toLocaleString('fa-IR')),
        img: imageUrl,
        priceValue: friend1,
      } as SelectionProduct;
    });
  }, [productsData]);

  const referenceOrderItems = useMemo(() => {
    if (groupOrderData && Array.isArray(groupOrderData.items)) {
      return groupOrderData.items.map((item: any, index: number) => ({
        productId: Number(item.product_id ?? index),
        quantity: item.quantity || 1,
        name: item.product_name || item.name || `محصول ${index + 1}`,
        price: item.price || item.base_price || 0,
        originalItem: item
      }));
    }
    if (selectionProducts.length) {
      return selectionProducts.slice(0, 5).map((sp, i) => ({
        productId: sp.id,
        quantity: i === 1 ? 2 : 1,
        name: sp.name,
        price: sp.priceValue,
      }));
    }
    return [] as any[];
  }, [groupOrderData, selectionProducts]);

  const productMap = useMemo(() => {
    const map: Record<number, any> = {};
    selectionProducts.forEach(sp => { map[sp.id] = sp; });
    if (groupOrderData && Array.isArray(groupOrderData.items)) {
      groupOrderData.items.forEach((item: any, index: number) => {
        const productName = item.product_name || item.name || `محصول ${index + 1}`;
        const productPrice = item.price || item.base_price || 0;
        const marketPrice = item.market_price || (productPrice * 1.2);
        const description = item.description || `توضیحات ${productName}`;
        const productImage = item.image && item.image.startsWith('http')
          ? item.image
          : '/images/placeholder-300.svg';
        const pid = Number(item.product_id ?? index);
        map[pid] = {
          id: pid,
          name: productName,
          category: "group-order",
          weight: description.includes('کیلوگرم') ? description : "1 کیلوگرم",
          sales: `+${(item.quantity || 1) * 10}`,
          stars: "★★★★★",
          oldPrice: toFaDigits(Math.round(marketPrice).toLocaleString()),
          newPrice: toFaDigits(productPrice.toLocaleString()),
          img: productImage,
          priceValue: productPrice,
          oldPriceValue: marketPrice,
          newPriceValue: productPrice,
        };
      });
    }
    return map;
  }, [selectionProducts, groupOrderData]);

  const __DEV__ = process.env.NODE_ENV !== 'production';
  const debugLog = (...args: any[]) => { if (__DEV__) console.log(...args); };

  useEffect(() => {
    if (Array.isArray(initialProducts) && initialProducts.length > 0) {
      debugLog('📦 Using server-provided initial products:', `count=${initialProducts.length}`);
      return;
    }
    debugLog('📡 Fetching products data...');
    fetchJson(`${apiBase}/api/admin/products`, { cache: 'no-store' })
      .then((data) => {
        debugLog('📦 Products data loaded:', Array.isArray(data) ? `count=${data.length}` : data);
        setProductsData(data);
      })
      .catch((error) => {
        console.error('❌ Error fetching products:', error);
      });
  }, []);

  useEffect(() => {
    const inviteCode = invite;
    debugLog('🔍 Invite code from URL:', inviteCode);
    try {
      if (inviteCode) localStorage.setItem('last_invite_code', inviteCode);
    } catch {}
    if (inviteCode) {
      if (initialGroupOrderData && initialGroupOrderData.success) {
        debugLog('🎯 Using server-provided initial group order data');
        setGroupOrderData(initialGroupOrderData);
        const statusRaw = String(initialGroupOrderData?.status || '').toLowerCase();
        if (statusRaw.includes('final') || statusRaw.includes('success') || statusRaw.includes('موفق')) {
          setGroupStatus('success');
          setDisabledJoin(true);
        } else if (statusRaw.includes('fail')) {
          setGroupStatus('failed');
          setDisabledJoin(true);
        } else {
          setGroupStatus('ongoing');
        }
      } else {
        setLoading(true);
        debugLog('📡 Fetching group order data for:', inviteCode);
        fetchJson(`/api/group-invite/${encodeURIComponent(inviteCode)}?t=${Date.now()}`)
          .then(data => {
            debugLog('📋 Raw response data:', data?.success ? 'success' : 'fail');
            if (data.success) {
              setGroupOrderData(data);
              const statusRaw2 = String(data?.status || '').toLowerCase();
              if (statusRaw2.includes('final') || statusRaw2.includes('success') || statusRaw2.includes('موفق')) {
                setGroupStatus('success');
                setDisabledJoin(true);
              } else if (statusRaw2.includes('fail')) {
                setGroupStatus('failed');
                setDisabledJoin(true);
              } else {
                setGroupStatus('ongoing');
              }
              debugLog('🎯 Group order data loaded successfully');
            } else {
              console.error('❌ Failed to load group order:', data);
            }
          })
          .catch(error => {
            console.error('❌ Error fetching group order:', error);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [invite]);

  useEffect(() => {
    let interval: any;
    const start = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        setRotatingTextIndex((prev) => (prev + 1) % rotatingMessages.length);
      }, 3000);
    };
    const stop = () => { if (interval) { clearInterval(interval); interval = null; } };
    const onVis = () => { if (document.visibilityState === 'hidden') stop(); else start(); };
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', onVis);
    }
    start();
    return () => {
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', onVis);
      }
      stop();
    };
  }, []);

  // Keep tabs sticky before hitting the very top bar by accounting for header height
  useEffect(() => {
    const rootEl = rootRef.current;
    const headerEl = headerRef.current;
    if (!rootEl || !headerEl) return;
    const updateOffset = () => {
      try {
        const rect = headerEl.getBoundingClientRect();
        const height = Math.max(0, Math.ceil(rect.height || 0));
        rootEl.style.setProperty('--landingTopOffset', `${height}px`);
      } catch {}
    };
    updateOffset();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateOffset());
      try { ro.observe(headerEl); } catch {}
    }
    const onResize = () => updateOffset();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
      }
      try { ro?.disconnect(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (!invite) return;
    let abort = false;
    (async () => {
      try {
        const data = await fetchJson(`/api/groups/${encodeURIComponent(invite)}`);
        if (abort) return;
        let targetMs: number | null = null;
        if (data?.remainingSeconds != null) {
          const secs = Math.max(0, Number(data.remainingSeconds) || 0);
          targetMs = Date.now() + secs * 1000;
        } else if (data?.expiresAtMs != null) {
          const srv = Number(data.serverNowMs);
          const clientNow = Date.now();
          const skew = Number.isFinite(srv) && srv > 0 ? (clientNow - srv) : 0;
          targetMs = (Number(data.expiresAtMs) || 0) + skew;
        } else if (data?.expiresInSeconds != null) {
          const secs = Math.max(0, Number(data.expiresInSeconds) || 0);
          targetMs = Date.now() + secs * 1000;
        } else if (data?.expiresAt) {
          const raw: string = data.expiresAt;
          const direct = Date.parse(raw);
          if (!Number.isNaN(direct)) {
            targetMs = direct;
          } else {
            const normalized = raw.replace(' ', 'T');
            if (!/Z|[+-]\d{2}:?\d{2}$/.test(normalized)) {
              const tehranTime = Date.parse(normalized + '+03:30');
              if (!Number.isNaN(tehranTime)) {
                targetMs = tehranTime;
              }
            } else {
              const parsed = Date.parse(normalized);
              if (!Number.isNaN(parsed)) {
                targetMs = parsed;
              }
            }
          }
        }
        if (targetMs != null) setExpiryMs(targetMs);
      } catch (e) { if (process.env.NODE_ENV !== 'production') console.error(e); }
    })();
    return () => { abort = true; };
  }, [invite]);

  const countdownRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!expiryMs) return;
    const update = () => {
      const remainingMs = Math.max(0, expiryMs - Date.now());
      const totalSeconds = Math.floor(remainingMs / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = Math.floor(totalSeconds % 60);
      const text = `${pad(h)}:${pad(m)}:${pad(s)}`;
      if (countdownRef.current) countdownRef.current.textContent = toFaDigits(text);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiryMs]);
  const pad = (n: number) => ("0" + n).slice(-2);

  useEffect(() => {
    const items = Object.values(customCart).reduce((a, b) => a + b, 0);
    const amount = Object.entries(customCart).reduce((sum, [idStr, qty]) => {
      const id = Number(idStr);
      const p = productMap[id];
      return sum + ((p?.priceValue || 0) * (Number(qty) || 0));
    }, 0);
    setTotalItems(items);
    setTotalAmount(amount);
  }, [customCart, productMap]);

  const handleAddToCart = (productId: number) => { setCustomCart(prev => ({ ...prev, [productId]: 1 })); };
  const handleIncrement = (productId: number) => { setCustomCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 })); };
  const handleDecrement = (productId: number) => {
    setCustomCart(prev => {
      const newCart: Record<number, number> = { ...prev };
      const current = Number(newCart[productId] || 0);
      if (current > 1) newCart[productId] = current - 1; else delete newCart[productId];
      return newCart;
    });
  };

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const openSheet = (title: string, body: React.ReactNode) => { setSheetContent({ title, body }); setIsSheetOpen(true); };
  const closeSheet = () => { setIsSheetOpen(false); };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isSheetOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return () => {};
  }, [isSheetOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }};
    document.addEventListener('keydown', onKey);
    const id = setTimeout(() => searchInputRef.current?.focus?.(), 0);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(id); };
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSheetOpen) return;
    const prevFocused = (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null);
    const container = sheetRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
      if (e.key === 'Tab' && container) {
        const nodes = container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); (last as HTMLElement).focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); (first as HTMLElement).focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => (closeBtnRef.current || container)?.focus?.(), 0);
    return () => { document.removeEventListener('keydown', onKey); prevFocused?.focus?.(); };
  }, [isSheetOpen]);

  const openModalWithProduct = (sp: SelectionProduct) => {
    const bp: any = productsData.find((p: any) => Number(p.id) === Number(sp.id));
    if (!bp) return;
    const catSrc = String(bp.category || '').toLowerCase();
    const cat: 'fruit' | 'veggie' | 'basket' = catSrc.includes('میوه') ? 'fruit' : (catSrc.includes('سبزی') || catSrc.includes('صیفی') || catSrc.includes('فصل')) ? 'veggie' : 'basket';
    const images: string[] = Array.isArray(bp.images) ? bp.images : (bp.image ? [bp.image] : []);
    const modalProduct: any = {
      id: Number(bp.id),
      cat,
      img: sp.img,
      name: String(bp.name || sp.name),
      weight: bp.weight_grams ?? sp.weight,
      weight_grams: bp.weight_grams,
      weight_tolerance_grams: bp.weight_tolerance_grams,
      star: bp.display_rating ?? 0,
      sales: bp.display_sales ?? 0,
      price: Number(bp.solo_price ?? bp.market_price ?? bp.base_price ?? 0) || 0,
      base_price: Number(bp.base_price ?? 0) || 0,
      market_price: Number(bp.market_price ?? 0) || 0,
      solo_price: Number(bp.solo_price ?? 0) || 0,
      friend_1_price: Number(bp.friend_1_price ?? 0) || 0,
      friend_2_price: Number(bp.friend_2_price ?? 0) || 0,
      friend_3_price: Number(bp.friend_3_price ?? 0) || 0,
      images,
    };
    try { openProductModal(modalProduct, { hideActions: true }); } catch (e) { if (process.env.NODE_ENV !== 'production') console.error(e); }
  };

  const openModalFromLeaderItem = (orderItem: any, fallback: { name: string; img: string }) => {
    const pid = Number(orderItem?.product_id ?? orderItem?.originalItem?.product_id ?? 0) || 0;
    const bp: any = pid ? productsData.find((p: any) => Number(p.id) === pid) : null;
    const catSrc = String(bp?.category || '').toLowerCase();
    const cat: 'fruit' | 'veggie' | 'basket' = catSrc.includes('میوه') ? 'fruit' : (catSrc.includes('سبزی') || catSrc.includes('صیفی') || catSrc.includes('فصل')) ? 'veggie' : 'basket';
    const images: string[] = Array.isArray(bp?.images) ? bp.images : (bp?.image ? [bp.image] : []);
    const modalProduct: any = {
      id: pid || Math.floor(Math.random() * 1000000),
      cat,
      img: bp?.image || fallback.img,
      name: String(bp?.name || fallback.name),
      weight: bp?.weight_grams ?? '',
      weight_grams: bp?.weight_grams,
      weight_tolerance_grams: bp?.weight_tolerance_grams,
      star: bp?.display_rating ?? 0,
      sales: bp?.display_sales ?? 0,
      price: Number(bp?.solo_price ?? bp?.market_price ?? bp?.base_price ?? 0) || 0,
      base_price: Number(bp?.base_price ?? 0) || 0,
      market_price: Number(bp?.market_price ?? 0) || 0,
      solo_price: Number(bp?.solo_price ?? 0) || 0,
      friend_1_price: Number(bp?.friend_1_price ?? 0) || 0,
      friend_2_price: Number(bp?.friend_2_price ?? 0) || 0,
      friend_3_price: Number(bp?.friend_3_price ?? 0) || 0,
      images,
    };
    try { openProductModal(modalProduct, { hideActions: true }); } catch (e) { if (process.env.NODE_ENV !== 'production') console.error(e); }
  };

  const handleJoinGroup = () => {
    if (!Array.isArray(productsData) || productsData.length === 0) {
      alert('در حال آماده‌سازی اطلاعات محصولات... لطفاً چند لحظه صبر کنید.');
      return;
    }
    if (disabledJoin) {
      alert('این گروه تکمیل شده است و امکان پیوستن وجود ندارد.');
      return;
    }
    try {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user');
      const isLoggedIn = !!token && !!user;
      if (!isLoggedIn) {
        setPendingAction('leader');
        setAuthOpen(true);
        return;
      }
    } catch {}
    try {
      const rawUser = localStorage.getItem('user');
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      const currentPhone = normalizePhone(parsedUser?.phone_number || '');
      const leaderPhone = normalizePhone(groupOrderData?.leader_phone || '');
      if (currentPhone && leaderPhone && currentPhone === leaderPhone) {
        alert('شما لیدر این گروه هستید و نمی‌توانید به عنوان دعوت‌شده خرید کنید.');
        return;
      }
    } catch {}
    if (!groupOrderData || !groupOrderData.items) {
      console.error('❌ No group order data available');
      alert('خطا: اطلاعات سفارش گروهی یافت نشد');
      return;
    }
    const cartItemsWithPrices: any[] = [];
    groupOrderData.items.forEach((item: any, index: number) => {
      const fallbackName = item.product_name || item.name || `محصول ${item.product_id || index+1}`;
      const fallbackImage = item.image || '/images/placeholder-300.svg';
      const qty = item.quantity || 1;
      const deriveFrom = (pid?: number) => {
        const p = pid ? getProductPrices(pid) : {} as any;
        const soloCandidate = Number((p as any).solo_price ?? item.solo_price ?? item.market_price ?? item.base_price ?? item.price ?? 0) || 0;
        const baseCandidate = Number((p as any).friend_1_price ?? item.friend_1_price ?? 0) || 0;
        let base = baseCandidate > 0 ? baseCandidate : 0;
        if (base <= 0) {
          const pBase = Number((p as any).base_price ?? item.base_price ?? 0) || 0;
          if (pBase > 0 && (soloCandidate === 0 || pBase <= soloCandidate)) base = pBase; else base = Math.round((soloCandidate || pBase) / 2) || pBase || soloCandidate;
        }
        const market = soloCandidate > 0 ? soloCandidate : (Number((p as any).market_price ?? item.market_price ?? 0) || base);
        const friend1 = baseCandidate > 0 ? baseCandidate : base;
        return { base, market, solo: soloCandidate, friend1 };
      };
      if (item.product_id && productsData.length > 0) {
        const pr = deriveFrom(item.product_id);
        const cartItem = {
          id: item.product_id,
          name: fallbackName,
          base_price: pr.base,
          market_price: pr.market,
          image: fallbackImage,
          quantity: qty,
          product_id: item.product_id,
          solo_price: pr.solo,
          friend_1_price: pr.friend1,
          friend_2_price: 0,
          friend_3_price: 0
        };
        cartItemsWithPrices.push(cartItem);
      } else {
        const pr = deriveFrom(undefined);
        const cartItem = {
          id: item.product_id || index + 1,
          name: fallbackName,
          base_price: pr.base,
          market_price: pr.market,
          image: fallbackImage,
          quantity: qty,
          solo_price: pr.solo,
          friend_1_price: pr.friend1,
        } as any;
        cartItemsWithPrices.push(cartItem);
      }
    });
    if (cartItemsWithPrices.length === 0) { alert('خطا: قیمت محصولات یافت نشد. لطفا دوباره تلاش کنید.'); return; }
    localStorage.setItem('groupOrderCartItems', JSON.stringify(cartItemsWithPrices));
    localStorage.setItem('groupOrderInfo', JSON.stringify({
      invite_code: groupOrderData.invite_code,
      leader_name: groupOrderData.leader_name,
      leader_phone: groupOrderData.leader_phone,
      is_joining_group: true,
      allow_consolidation: groupOrderData.allow_consolidation || false
    }));
    const go = () => router.push(`/checkout?mode=group&invited=true&invite_code=${encodeURIComponent(groupOrderData.invite_code)}&allow=${groupOrderData.allow_consolidation ? '1' : '0'}`);
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) { requestAnimationFrame(() => queueMicrotask(go)); } else { queueMicrotask(go); }
  };

  const handleCheckoutCustom = () => {
    const fromLeader = referenceOrderTotals.totalWith1Friend || 0;
    const targetAmount = fromLeader > 0 ? fromLeader : defaultTargetAmount;
    const isReady = totalAmount >= targetAmount;
    if (!isReady) {
      openSheet('سبد شما کامل نیست', (<p style={{ padding: 16, lineHeight: 1.9 }}>برای پیوستن با سبد دلخواه، باید حداقل <b>{faPrice(targetAmount)}</b> تومان انتخاب کنید.</p>));
      return;
    }
    try {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user');
      const isLoggedIn = !!token && !!user;
      if (!isLoggedIn) { setPendingAction('custom'); setAuthOpen(true); return; }
    } catch {}
    try {
      const rawUser = localStorage.getItem('user');
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      const currentPhone = normalizePhone(parsedUser?.phone_number || '');
      const leaderPhone = normalizePhone(groupOrderData?.leader_phone || '');
      if (currentPhone && leaderPhone && currentPhone === leaderPhone) { alert('شما لیدر این گروه هستید و نمی‌توانید به عنوان دعوت‌شده خرید کنید.'); return; }
    } catch {}
    if (!groupOrderData) { alert('خطا: اطلاعات سفارش گروهی یافت نشد'); return; }
    const cartItemsWithPrices: any[] = [];
    Object.entries(customCart).forEach(([idStr, qty]) => {
      const id = Number(idStr);
      const prod = productsData.find((p: any) => Number(p.id) === id);
      const name = prod?.name || `محصول ${id}`;
      const image = (Array.isArray(prod?.images) && prod.images[0]) || prod?.image_url || '/images/placeholder-300.svg';
      const solo = Number(prod?.solo_price ?? prod?.market_price ?? prod?.base_price ?? 0) || 0;
      const friend1Raw = Number(prod?.friend_1_price ?? 0) || 0;
      const base_price = friend1Raw > 0 ? friend1Raw : (Number(prod?.base_price ?? 0) || Math.round(solo / 2) || solo);
      const market_price = solo > 0 ? solo : (Number(prod?.market_price ?? 0) || base_price);
      cartItemsWithPrices.push({ id, name, base_price, market_price, image, quantity: Number(qty) || 1, product_id: id, solo_price: solo, friend_1_price: friend1Raw || base_price, friend_2_price: Number(prod?.friend_2_price ?? 0) || 0, friend_3_price: Number(prod?.friend_3_price ?? 0) || 0 });
    });
    if (!cartItemsWithPrices.length) return;
    localStorage.setItem('groupOrderCartItems', JSON.stringify(cartItemsWithPrices));
    localStorage.setItem('groupOrderInfo', JSON.stringify({
      invite_code: groupOrderData.invite_code,
      leader_name: groupOrderData.leader_name,
      leader_phone: groupOrderData.leader_phone,
      is_joining_group: true,
      allow_consolidation: groupOrderData.allow_consolidation || false
    }));
    const go = () => router.push(`/checkout?mode=group&invited=true&invite_code=${encodeURIComponent(groupOrderData.invite_code)}&allow=${groupOrderData.allow_consolidation ? '1' : '0'}`);
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) { requestAnimationFrame(() => queueMicrotask(go)); } else { queueMicrotask(go); }
  };

  const renderGroupBasket = () => {
    const body = (
      <div>
        {referenceOrderItems.map((orderItem, idx) => {
          const key = orderItem.originalItem?.product_id ?? orderItem.productId;
          const product = productMap[Number(key)];
          if (!product) return null;
          let soloPrice = 0;
          let friend1Price = 0;
          if (orderItem.originalItem && orderItem.originalItem.product_id) {
            const prices = getProductPrices(orderItem.originalItem.product_id);
            soloPrice = prices.solo_price;
            friend1Price = prices.friend_1_price;
          } else {
            soloPrice = Number(product.oldPriceValue ?? parseFaNumber(product.oldPrice || '0')) || 0;
            friend1Price = Number(product.newPriceValue ?? product.priceValue ?? parseFaNumber(product.newPrice || '0')) || 0;
          }
          return (
            <div className="sheet-item-group" key={Number(key)}>
              <div className="right">
                <img src={product.img} alt={product.name} loading="lazy" />
                <div>
                  <div className="title">{product.name}</div>
                  <div className="weight">{product.weight}</div>
                  <div style={{ marginTop: 4, fontWeight: 700, color: '#c42121' }}>تعداد: {toFaDigits(orderItem.quantity.toString())}</div>
                </div>
              </div>
              <div className="prices">
                <div className="price-alone">{faPrice(soloPrice)} تومان</div>
                <div className="price-with-friend">{faPrice(friend1Price)} تومان</div>
              </div>
            </div>
          );
        })}
      </div>
    );
    openSheet(`${toFaDigits(referenceOrderItems.length.toString())} کالا در سبد`, body);
  };

  const renderUserCart = () => {
    if (!Object.keys(customCart).length) { openSheet("سبد شما", (<p style={{ padding: 24, textAlign: 'center' }}>سبد شما خالی است ✨</p>)); return; }
    const body = (
      <div>
        {Object.entries(customCart).map(([idStr, qty]) => {
          const id = Number(idStr);
          const p = selectionProducts.find(sp => sp.id === id);
          if (!p) return null;
          return (
            <div className="sheet-item" key={id}>
              <img src={p.img} alt={p.name} className="thumb" loading="lazy" />
              <div className="info">
                <div className="title">{p.name}</div>
                <div className="weight">{p.weight}</div>
                <div className="qty-controller" data-id={id}>
                  تعداد:
                  <button className="plus" onClick={() => handleIncrement(id)} aria-label="افزایش">+</button>
                  <span className="qty-num">{toFaDigits(String(qty))}</span>
                  <button className="minus" onClick={() => handleDecrement(id)} aria-label="کاهش">-</button>
                </div>
              </div>
              <div className="prices">
                <div className="price-old">{p.oldPrice} تومان</div>
                <div className="price-new">{p.newPrice} تومان</div>
              </div>
            </div>
          );
        })}
      </div>
    );
    openSheet(`${toFaDigits(totalItems.toString())} کالا در سبد`, body);
  };

  const referenceOrderTotals = useMemo(() => {
    return referenceOrderItems.reduce((totals, item) => {
      const pid = Number(item.originalItem?.product_id ?? item.productId);
      const product = productMap[pid];
      let soloPrice = 0, friend1Price = 0;
      if (item.originalItem?.product_id) {
        const prices = getProductPrices(pid);
        soloPrice = prices.solo_price;
        friend1Price = prices.friend_1_price || prices.base_price || prices.solo_price;
      } else if (product) {
        const oldNum = parseFaNumber(product.oldPrice || '0');
        const newNum = parseFaNumber(product.newPrice || '0');
        soloPrice = oldNum;
        friend1Price = newNum;
      }
      return {
        totalAlone: totals.totalAlone + soloPrice * item.quantity,
        totalWith1Friend: totals.totalWith1Friend + friend1Price * item.quantity,
      };
    }, { totalAlone: 0, totalWith1Friend: 0 });
  }, [referenceOrderItems, productMap, productsData]);

  const referenceOrderOldTotal = referenceOrderTotals.totalAlone;
  const targetAmount = useMemo(() => {
    const fromLeader = Number(referenceOrderTotals.totalWith1Friend || 0);
    return fromLeader > 0 ? fromLeader : defaultTargetAmount;
  }, [referenceOrderTotals.totalWith1Friend]);
  const progressPercent = Math.min((totalAmount / targetAmount) * 100, 100);
  const remainingAmount = Math.max(targetAmount - totalAmount, 0);
  const isReady = totalAmount >= targetAmount;

  const formattedRefWithFriend = useMemo(() => faPrice(referenceOrderTotals.totalWith1Friend), [referenceOrderTotals.totalWith1Friend]);
  const formattedRefAlone = useMemo(() => faPrice(referenceOrderTotals.totalAlone), [referenceOrderTotals.totalAlone]);
  const formattedRemainingAmount = useMemo(() => faPrice(remainingAmount), [remainingAmount]);
  const formattedTargetAmount = useMemo(() => faPrice(targetAmount), [targetAmount]);
  const formattedTotalAmount = useMemo(() => faPrice(totalAmount), [totalAmount]);

  const isGroupReady = !!groupOrderData && Array.isArray(groupOrderData.items);

  return (
    <div className="landing-root" ref={rootRef}>
      <header ref={headerRef}>
        <button className="share-icon" aria-label="اشتراک‌گذاری" onClick={() => {
          if (typeof window === 'undefined') return;
          
          // Generate environment-aware link
          let shareUrl = window.location.href;
          const inviteCode = extractInviteCode(shareUrl);
          if (inviteCode) {
            // Regenerate the link based on current environment
            shareUrl = generateInviteLink(inviteCode);
          }
          
          const urlEnc = encodeURIComponent(shareUrl);
          
          if (navigator.share) {
            navigator.share({ title: document.title || 'اشتراک‌گذاری', url: shareUrl }).catch(() => {});
            return;
          }
          
          const shareMessage = 'بیا با هم سبد رو بخریم تا رایگان بگیریم!';
          
          openSheet("اشتراک‌گذاری", (
            <div className="share-grid">
              <a href={generateShareUrl('telegram', shareUrl, shareMessage)} target="_blank" rel="noopener noreferrer"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/telegram.svg" alt="تلگرام" loading="lazy" /></a>
              <a href={generateShareUrl('whatsapp', shareUrl, shareMessage)} target="_blank" rel="noopener noreferrer"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/whatsapp.svg" alt="واتساپ" loading="lazy" /></a>
              <button className="copy-link" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); alert('لینک کپی شد'); } catch { window.prompt('کپی لینک', shareUrl); }}}>کپی لینک</button>
            </div>
          ));
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2"/>
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M8.59 13.51L15.42 17.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M15.41 6.51L8.59 10.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div id="rotatingText" className={rotatingTextIndex !== 0 ? 'fade-up' : ''} onClick={() => openSheet("توضیحات", (<p style={{ lineHeight: 1.9 }}>با خرید گروهی مستقیماً از مزرعه، هزینهٔ هر نفر کاهش می‌یابد.</p>))}>
          <span>{rotatingMessages[rotatingTextIndex]}</span>
        </div>
      </header>

      <p className="discount-text">
        پرداخت {isGroupReady ? <b>{formattedRefWithFriend}</b> : <span className="skel-line" aria-hidden="true" />}<span className="currency">تومان</span> بجای {isGroupReady ? <s>{formattedRefAlone}</s> : <span className="skel-line" aria-hidden="true" />}<span className="currency">تومان</span> با خرید این سبد
      </p>

      <div className="basket-head">
        <button className="view-full" onClick={() => { renderGroupBasket(); }}>مشاهده کامل سبد</button>
      </div>

      <section className="basket-carousel" id="basket">
        {isGroupReady ? (
          referenceOrderItems.map((item, index) => {
            const key = item.originalItem?.product_id ?? item.productId;
            const product = productMap[Number(key)];
            if (!product) return null;
            return (
              <div key={Number(key)} className="basket-item" onClick={() => openModalFromLeaderItem(referenceOrderItems[index]?.originalItem ?? referenceOrderItems[index], { name: product.name, img: product.img })}>
                <img src={product.img} alt={product.name} loading="lazy" decoding="async" fetchPriority="low" width={90} height={90} />
                <span className="qty">{toFaDigits(item.quantity.toString())}</span>
              </div>
            );
          })
        ) : (
          <div className="basket-skeleton" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-circle" />
            ))}
          </div>
        )}
      </section>

      <div className="countdown-wrapper">
        <span id="countdown" ref={countdownRef}>۰۰:۰۰:۰۰</span>
        <span className="countdown-label">تا پایان این خرید گروهی زمان باقیست</span>
      </div>

      <button 
        className={`cta-btn ${disabledJoin ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={handleJoinGroup}
        disabled={disabledJoin}
        aria-disabled={disabledJoin}
        title={disabledJoin ? 'گروه تکمیل شده است' : 'پیوستن به گروه'}
      >
        {disabledJoin ? 'گروه تکمیل شده است' : 'پیوستن به گروه با خرید سبد دوستت'}
      </button>

      <hr className="divider" />

      <PhoneAuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          try {
            const token = localStorage.getItem('auth_token');
            const user = localStorage.getItem('user');
            if (token && user) {
              setAuthOpen(false);
              try {
                const parsedUser = JSON.parse(user);
                const currentPhone = normalizePhone(parsedUser?.phone_number || '');
                const leaderPhone = normalizePhone(groupOrderData?.leader_phone || '');
                if (currentPhone && leaderPhone && currentPhone === leaderPhone) { alert('شما لیدر این گروه هستید و نمی‌توانید به عنوان دعوت‌شده خرید کنید.'); return; }
              } catch {}
              if (pendingAction === 'leader') {
                const cartItemsWithPrices: any[] = [];
                if (groupOrderData && groupOrderData.items) {
                  groupOrderData.items.forEach((item: any, index: number) => {
                    const fallbackName = item.product_name || item.name || `محصول ${item.product_id || index+1}`;
                    const fallbackImage = item.image || '/images/placeholder-300.svg';
                    const qty = item.quantity || 1;
                    if (item.product_id && productsData.length > 0) {
                      const prices = getProductPrices(item.product_id);
                      const base = prices.friend_1_price || item.base_price || item.price || 0;
                      const market = prices.solo_price || item.market_price || base;
                      cartItemsWithPrices.push({ id: item.product_id, name: fallbackName, base_price: base, market_price: market, image: fallbackImage, quantity: qty, product_id: item.product_id, solo_price: prices.solo_price || item.market_price || 0, friend_1_price: prices.friend_1_price || 0, friend_2_price: prices.friend_2_price || 0, friend_3_price: prices.friend_3_price || 0 });
                    } else {
                      cartItemsWithPrices.push({ id: item.product_id || index + 1, name: fallbackName, base_price: item.base_price || item.price || 0, market_price: item.market_price || item.base_price || item.price || 0, image: fallbackImage, quantity: qty });
                    }
                  });
                }
                if (cartItemsWithPrices.length) {
                  localStorage.setItem('groupOrderCartItems', JSON.stringify(cartItemsWithPrices));
                  localStorage.setItem('groupOrderInfo', JSON.stringify({ invite_code: groupOrderData.invite_code, leader_name: groupOrderData.leader_name, leader_phone: groupOrderData.leader_phone, is_joining_group: true, allow_consolidation: groupOrderData.allow_consolidation || false }));
                }
                router.push(`/checkout?mode=group&invited=true&invite_code=${encodeURIComponent(groupOrderData.invite_code)}&allow=${groupOrderData.allow_consolidation ? '1' : '0'}`);
                return;
              }
              if (pendingAction === 'custom') {
                const cartItemsWithPrices: any[] = [];
                Object.entries(customCart).forEach(([idStr, qty]) => {
                  const id = Number(idStr);
                  const prod = productsData.find((p: any) => Number(p.id) === id);
                  const name = prod?.name || `محصول ${id}`;
                  const image = (Array.isArray(prod?.images) && prod.images[0]) || prod?.image_url || '/images/placeholder-300.svg';
                  const prices = { solo_price: Number(prod?.solo_price ?? prod?.market_price ?? prod?.base_price ?? 0) || 0, friend_1_price: Number(prod?.friend_1_price ?? 0) || 0, friend_2_price: Number(prod?.friend_2_price ?? 0) || 0, friend_3_price: Number(prod?.friend_3_price ?? 0) || 0, market_price: Number(prod?.market_price ?? 0) || 0, base_price: Number(prod?.base_price ?? 0) || 0 };
                  const base = prices.friend_1_price || prices.base_price || prices.solo_price || 0;
                  const market = prices.solo_price || prices.market_price || base;
                  cartItemsWithPrices.push({ id, name, base_price: base, market_price: market, image, quantity: Number(qty) || 1, product_id: id, solo_price: prices.solo_price, friend_1_price: prices.friend_1_price, friend_2_price: prices.friend_2_price, friend_3_price: prices.friend_3_price });
                });
                if (!cartItemsWithPrices.length) return;
                localStorage.setItem('groupOrderCartItems', JSON.stringify(cartItemsWithPrices));
                localStorage.setItem('groupOrderInfo', JSON.stringify({ invite_code: groupOrderData.invite_code, leader_name: groupOrderData.leader_name, leader_phone: groupOrderData.leader_phone, is_joining_group: true, allow_consolidation: groupOrderData.allow_consolidation || false }));
                router.push(`/checkout?mode=group&invited=true&invite_code=${encodeURIComponent(groupOrderData.invite_code)}&allow=${groupOrderData.allow_consolidation ? '1' : '0'}`);
                return;
              }
              return;
            }
          } catch {}
          setAuthOpen(false);
        }}
      />

      <div className="green-box" onClick={() => openSheet("اطلاعات بیشتر", (<p style={{ lineHeight: 1.9 }}>اگر سبد جدید تشکیل بدهی، همچنان عضو همین گروه می‌مانی و دو سبد در انتها تجمیع می‌شوند.</p>))}>
        با تشکیل سبد خودت هم،میتونی عضو این گروه بشی!
      </div>

      <section>
        <nav className="tabs" id="tabs">
          <div className="tabs-row">
            <div className="tabs-left">
              {!isSearchOpen && (
                <button className="tab search-btn" aria-label="جستجو" onClick={() => setIsSearchOpen(true)}>
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
              )}
              {isSearchOpen && (
                <div className="inline-search">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="inline-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="جستجوی محصولات"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  <button className="close-x" aria-label="بستن" onClick={closeSearch}>&times;</button>
                </div>
              )}
              <span className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')} data-category="all">همه</span>
              <span className={`tab ${activeTab === 'fruit' ? 'active' : ''}`} onClick={() => setActiveTab('fruit')} data-category="fruit">میوه ها</span>
              <span className={`tab ${activeTab === 'veggie' ? 'active' : ''}`} onClick={() => setActiveTab('veggie')} data-category="veggie">صیفی جات</span>
            </div>
          </div>
        </nav>

        <section id="productGrid" className="products">
          {selectionProducts
            .filter(p => activeTab === 'all' || p.category === activeTab)
            .filter(p => {
              const q = searchQuery.trim();
              if (!q) return true;
              try { return String(p.name || '').toLowerCase().includes(q.toLowerCase()); } catch { return true; }
            })
            .slice(0, loadedProducts)
            .map((product, idx) => {
              const pid = product.id;
              const qty = customCart[pid] || 0;
              return (
                <div key={pid} className="product" data-category={product.category} data-id={pid}>
                  <div className="prod-img" onClick={() => openModalWithProduct(product)}>
                    {idx === 0 ? (
                      <Image
                        src={product.img}
                        alt={product.name}
                        width={320}
                        height={320}
                        priority
                        fetchPriority="high"
                        sizes="(max-width:768px) 100vw, 320px"
                        placeholder="blur"
                        blurDataURL="/images/tiny-blur.svg"
                        style={{ objectFit: 'cover', borderRadius: 12 }}
                      />
                    ) : (
                      <img src={product.img} alt={product.name} loading="lazy" decoding="async" fetchPriority="low" width={300} height={300} />
                    )}
                    {!qty ? (
                      <button className="add-btn" onClick={(e) => { e.stopPropagation(); handleAddToCart(pid); }}>+ افزودن</button>
                    ) : (
                      <div className={`qty-box ${qty ? 'visible' : ''}`}>
                        <button className="plus" onClick={(e) => { e.stopPropagation(); handleIncrement(pid); }}>
                          <FontAwesomeIcon icon={faPlusSolid} className="iconXs" />
                        </button>
                        <span className="count">{toFaDigits(String(qty))}</span>
                        <button className="minus" onClick={(e) => { e.stopPropagation(); handleDecrement(pid); }}>
                          <FontAwesomeIcon icon={faMinusSolid} className="iconXs" />
                        </button>
                      </div>
                    )}
                  </div>
                  <h3 className="name">{product.name}</h3>
                  <p className="weight">{product.weight}</p>
                  <div className="rating">
                    <FontAwesomeIcon icon={faStar} style={{ color: '#ffbf00' }} />
                    <span className="score">{product.stars}</span>
                    <span className="sales"><span dir="ltr" style={{ display: 'inline-block' }}>{product.sales}</span> فروش</span>
                  </div>
                  <div className="prices">
                    <div className="price-line">
                      <span className="label">تنها:</span>
                      <span className="value strike">{product.oldPrice} تومان</span>
                    </div>
                    <div className="price-line">
                      <span className="label">گروهی:</span>
                      <span className="value">{product.newPrice} تومان</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </section>
      </section>

      {totalAmount > 0 && (
        <div className={`progress-bar ${isReady ? 'ready' : ''}`} id="progressBar" style={{ display: 'block' }}>
          <div className="progress-header">
            <span className="item-count" id="itemCount">{toFaDigits(totalItems.toString())} کالا در سبد</span>
            <button className="view-cart" onClick={() => { renderUserCart(); }}>مشاهده سبد</button>
          </div>
          {!isReady && (
            <>
              <div className="progress-info">
                <span className="target-amount" id="targetAmount">{formattedRemainingAmount} تومان باقی‌مانده</span>
                <span className="remaining-amount" id="remainingAmount">حداقل مبلغ برای این خرید گروهی : {formattedTargetAmount} تومان</span>
              </div>
              <div className="progress-container">
                <div className="progress-fill" id="progressFill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </>
          )}
          {isReady && (
            <div className="ready-footer" id="readyFooter" style={{ display: 'flex' }}>
              <div className="basket-total">
                <span className="label">مجموع سبد</span>
                <span className="price" id="summaryPrice">{formattedTotalAmount} تومان</span>
              </div>
              <button className="cta-ready" id="ctaReady" onClick={handleCheckoutCustom}>پیوستن به گروه با این سبد</button>
            </div>
          )}
        </div>
      )}

      {isSheetOpen && (
        <>
          <div id="sheetOverlay" className="sheet-overlay visible" onClick={closeSheet}></div>
          <div id="bottomSheet" className="bottom-sheet open" role="dialog" aria-hidden="false" aria-modal="true" ref={sheetRef} tabIndex={-1}>
            <div className="sheet-handle"></div>
            <div id="sheetContent" className="sheet-content">
              <div className="sheet-header">
                <span>{sheetContent.title}</span>
                <button className="close-btn" aria-label="بستن" onClick={closeSheet} ref={closeBtnRef}>&times;</button>
              </div>
              <div>{sheetContent.body}</div>
            </div>
          </div>
        </>
      )}

      {/* Inline search only; no overlay/drawer */}

      <ProductModal />

      <style jsx>{`
        .basket-skeleton { display: flex; gap: 12px; padding: 8px 0; }
        .skeleton-circle { width: 90px; height: 90px; border-radius: 12px; background: linear-gradient(90deg,#eee 25%,#f5f5f5 37%,#eee 63%); background-size: 400% 100%; animation: shimmer 1.2s infinite; }
        .skel-line { display:inline-block; width: 96px; height: 1em; border-radius: 6px; vertical-align: middle; background: linear-gradient(90deg,#eee 25%,#f5f5f5 37%,#eee 63%); background-size: 400% 100%; animation: shimmer 1.2s infinite; }
        @keyframes shimmer { 0% { background-position: 100% 0 } 100% { background-position: -100% 0 } }
        /* Keep the category tabs pinned while scrolling the product list, just below header */
        /* z-index is below ProductModal overlay (60) to avoid overlapping the popup */
        .tabs { position: sticky; top: var(--landingTopOffset, 0px); z-index: 40; background: #ffffff; border-bottom: 1px solid #f1f1f1; }
        .tabs :global(.tab) { padding-inline: 10px; }
        .tabs-row { display: flex; align-items: center; justify-content: flex-start; gap: 12px; padding: 8px 0 8px 12px; }
        .tabs-left { display: flex; align-items: center; gap: 12px; width: 100%; justify-content: flex-end; overflow-x: auto; }
        .tabs-left > :global(*) { flex: 0 0 auto; }
        .search-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 40px; height: 32px; border-radius: 8px; background: #f7f7f7; color: #333; }
        .search-btn :global(svg) { width: 16px; height: 16px; }
        .inline-search { display: flex; align-items: center; gap: 6px; background: #f7f7f7; padding: 3px 6px; border-radius: 8px; }
        .inline-icon { width: 14px; height: 14px; color: #666; }
        .search-input { width: 120px; height: 26px; border: none; outline: none; background: transparent; font-size: 13px; }
        @media (min-width: 390px) { .search-input { width: 150px; } }
        .tab { font-size: 14px; }
        /* Ensure overlays cover sticky elements */
        .sheet-overlay { z-index: 10000; }
        .bottom-sheet { z-index: 10001; }

        /* Removed drawer styles; inline only */
      `}</style>
    </div>
  );
}


