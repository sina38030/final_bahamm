'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import ReactDOM from 'react-dom';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/utils/api';
import apiClient from '@/utils/apiClient';

// Dynamic import of AddressMapModal component to avoid SSR issues
const AddressMapModal = dynamic(() => import('@/components/map/AddressMapModal'), {
  ssr: false,
  loading: () => <div className="h-96 w-full bg-gray-100 animate-pulse" />,
});

interface Address {
  id: number;
  text: string;
  phone: string;
  main: boolean;
}

const toFa = (val: number | string) =>
  val.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

const comma = (n: number) =>
  toFa(n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬'));

const formatPrice = (n: number) => `${comma(n)} تومان`;

function AddressPopup({open,addresses,onClose,onEdit,onAdd,onDelete,onSetMain}:{open:boolean,addresses:any[],onClose:()=>void,onEdit:()=>void,onAdd:()=>void,onDelete:(id:string|number)=>void,onSetMain:(id:string|number)=>void}){
  if(!open) return null;
  return ReactDOM.createPortal(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:9999}} onClick={onClose}>
      <div style={{background:'#fff',width:'100%',maxWidth:420,borderRadius:'20px 20px 0 0',padding:'20px 16px 32px',position:'relative',maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <button style={{background:'none',border:'none',fontSize:'1.4rem',position:'absolute',top:10,left:16,cursor:'pointer'}} onClick={onClose}>×</button>
        <h3 style={{margin:'0 0 1rem',fontSize:'1rem',fontWeight:700,color:'#444'}}>آدرس‌ها</h3>
        {addresses.map(addr=>(
           <div key={addr.id} style={{border:'1px solid #e0e0e0',borderRadius:14,padding:'12px',marginBottom:'10px',fontSize:'.85rem',display:'flex',flexDirection:'column',gap:6}}>
             <div style={{fontSize:'.8rem',color:'#555'}}>{addr.phone_number || addr.phone}</div>
             <div>{addr.full_address || addr.text}</div>
             <div style={{display:'flex',justifyContent:'space-between',fontSize:'.8rem',color:'#777'}}>
                <div>
                  {addresses.length>1 && <button style={{background:'none',border:'none',color:'#E31C5F',cursor:'pointer'}} onClick={()=>onDelete(addr.id)}>حذف</button>}
                  <button style={{background:'none',border:'none',color:'#E31C5F',cursor:'pointer'}} onClick={onEdit}>ویرایش</button>
                </div>
                 <div>
                  <input type="radio" name="mainAddr" checked={!!(addr?.is_default || addr?.main)} onChange={()=>onSetMain(addr.id)} />
                  <span style={{fontSize:'.8rem'}}>اصلی</span>
                </div>
             </div>
           </div>
        ))}
        <button style={{width:'100%',background:'#E31C5F',color:'#fff',border:'none',borderRadius:14,padding:'11px',fontSize:'.9rem',cursor:'pointer'}} onClick={onAdd}>افزودن آدرس جدید</button>
      </div>
    </div>,
    document.body
  );
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, getSingleBuyTotal, getGroupBuyTotal, groupBuyOption, addItem, clearCart } = useCart();
  const { token, isAuthenticated, user, addresses: authAddresses, loadUserAddresses, deleteUserAddress, updateUserAddress, addUserAddress, refreshCoins } = useAuth();
  const mode = searchParams.get('mode') || 'group';
  const friendsParam = searchParams.get('friends');
  const maxFriendsParam = searchParams.get('maxFriends');
  const expectedFriendsParam = searchParams.get('expectedFriends');
  const invitedParam = searchParams.get('invited'); // Check if user is invited
  const inviteCodeParam = searchParams.get('invite_code');
  const allowParam = searchParams.get('allow'); // '1' or '0' from landing
  // New flexible payment parameters
  const paymentAmountParam = searchParams.get('paymentAmount');
  const paymentPercentageParam = searchParams.get('paymentPercentage');
  const friendPriceParam = searchParams.get('friendPrice');
  // Expected friends passed from cart (leaders only)
  
  // Debug logging
  console.log('💳 Checkout received params:', {
    paymentAmountParam,
    paymentPercentageParam,
    friendPriceParam,
    mode,
    friendsParam,
    maxFriendsParam
  });
  // Convert 'alone' to 'solo' for consistency
  const actualMode = mode === 'alone' ? 'solo' : mode;
  const isInvitedUser = invitedParam === 'true';
  const isLeaderGroup = actualMode === 'group' && !isInvitedUser;
  // Use admin-configured next-day delivery slots for invited users, solo purchases, and leaders
  const useAdminTomorrowSlots = isInvitedUser || actualMode === 'solo' || isLeaderGroup;

  // State for group order joining
  const [groupOrderInfo, setGroupOrderInfo] = useState<any>(null);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [groupCartItems, setGroupCartItems] = useState<any[]>([]);

  // State
  const [tickerIndex, setTickerIndex] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'gateway' | 'wallet'>('gateway');
  // Disable consolidation for invited-led secondary groups (set later by rule)
  const [greenToggle, setGreenToggle] = useState(false);
  const [forceDisableConsolidation, setForceDisableConsolidation] = useState(false);
  const [savedAddress, setSavedAddress] = useState<{
    fullAddress: string;
    details: string;
    phone: string;
    coordinates?: any;
  } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  // Dynamic delivery slots for invited users (next day)
  const [tomorrowIso, setTomorrowIso] = useState<string | null>(null);
  const [hasSetDefaultSlot, setHasSetDefaultSlot] = useState(false);
  const [tomorrowSlotObjs, setTomorrowSlotObjs] = useState<Array<{ start_time: string; end_time: string }>>([]);
  const [tomorrowSlotLabels, setTomorrowSlotLabels] = useState<string[]>([]);
  const [tomorrowLabelPrefix, setTomorrowLabelPrefix] = useState<string>('فردا');

  const toFaDigits = (s: string) => s.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
  
  // Convert ISO date to Persian date
  const formatPersianDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const persianDate = date.toLocaleDateString('fa-IR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return persianDate;
    } catch (error) {
      console.error('Error formatting Persian date:', error);
      return dateString;
    }
  };
  const hhToLabel = (t: string) => {
    // Expect HH:MM -> HH
    const [h] = t.split(':');
    return toFaDigits(String(parseInt(h, 10)));
  };

  const [showSummaryPopup, setShowSummaryPopup] = useState(false);
  const [showHeaderPopup, setShowHeaderPopup] = useState(false);
  const [showShipPopup, setShowShipPopup] = useState(false);
  const [showBasketPopup, setShowBasketPopup] = useState(false);
  const [showLeaderShipInfoPopup, setShowLeaderShipInfoPopup] = useState(false);
  const [showInvitedShipInfoPopup, setShowInvitedShipInfoPopup] = useState(false);
  const [chosenDay, setChosenDay] = useState(0);
  const [chosenSlot, setChosenSlot] = useState(0);
  const [tempChosenSlot, setTempChosenSlot] = useState(0);
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  // Use addresses from AuthContext instead of local state
  // const [addresses, setAddresses] = useState<any[]>([]);
  // Header details fetched directly from server for reliability
  const [headerDetails, setHeaderDetails] = useState<string>('');
  // Fresh modal initial values (always fetched from server before opening)
  const [modalInit, setModalInit] = useState<{
    fullAddress?: string;
    details?: string;
    phone?: string;
    coordinates?: { lat: number; lng: number };
  } | null>(null);
  // Current default address from server (AuthContext)
  const currentDefaultAddress = useMemo(() => {
    if (authAddresses && authAddresses.length > 0) {
      return authAddresses.find(a => a.is_default) || authAddresses[0];
    }
    return undefined;
  }, [authAddresses]);
  
  // Map modal state
  const [showMapModal, setShowMapModal] = useState(false);
  const [leaderAllowsConsolidation, setLeaderAllowsConsolidation] = useState<boolean>(false);
  const normalizePhone = (p?: string) => {
    if (!p) return '';
    const toEn = (s: string) => s.replace(/[۰-۹]/g, d => '0123456789'["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);
    let s = toEn(String(p));
    s = s.replace(/[^\d]/g, '');
    if (s.startsWith('0098')) s = '0' + s.slice(4);
    else if (s.startsWith('+98')) s = '0' + s.slice(3);
    else if (s.startsWith('98')) s = '0' + s.slice(2);
    if (!s.startsWith('0') && s.length === 10) s = '0' + s;
    return s;
  };

  const tickerMessages = [
    'هزینهٔ ارسال خرید بالای ۳۰۰٬۰۰۰ تومان رایگان است',
    'با دعوت دوست تا ۴۰٪ تخفیف بگیرید',
    'پیشنهاد شگفت‌انگیز امروز را از دست ندهید!'
  ];

  const days = [
    { id: 0, label: 'پنجشنبه', dayNum: 1 },
    { id: 1, label: 'جمعه', dayNum: 2 },
    { id: 2, label: 'شنبه', dayNum: 3 },
    { id: 3, label: 'یکشنبه', dayNum: 4 },
    { id: 4, label: 'دوشنبه', dayNum: 5 }
  ];

  // Default static slots (fallback when admin slots are not enforced)
  const slots = ['۹ تا ۱۲', '۱۲ تا ۱۵', '۱۵ تا ۱۸', '۱۸ تا ۲۲'];
  // Enforce rule: invited and solo users should see next-day slots from admin when available
  const availableSlotLabels = useAdminTomorrowSlots ? tomorrowSlotLabels : slots;

  const walletBalance = Math.max(0, Number((user as any)?.coins || 0));

  // Refresh coins on mount and on window focus to reflect admin changes
  useEffect(() => {
    try { refreshCoins(); } catch {}
    const onFocus = () => { try { refreshCoins(); } catch {} };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshCoins]);

  // Ensure wallet method isn't selected when balance is zero
  useEffect(() => {
    if (walletBalance <= 0 && paymentMethod === 'wallet') {
      setPaymentMethod('gateway');
    }
  }, [walletBalance, paymentMethod]);

  // Resolve default address from AuthContext (server truth) for editing modal prefill
  const defaultServerAddress = useMemo(() => {
    if (authAddresses && authAddresses.length > 0) {
      return authAddresses.find(a => a.is_default) || authAddresses[0];
    }
    return null;
  }, [authAddresses]);

  const initialDetailsForEdit = useMemo(() => {
    return (defaultServerAddress?.receiver_name && String(defaultServerAddress.receiver_name).trim() !== '')
      ? defaultServerAddress.receiver_name
      : (savedAddress?.details || '');
  }, [defaultServerAddress, savedAddress?.details]);

  const initialPhoneForEdit = useMemo(() => {
    return (defaultServerAddress?.phone_number && String(defaultServerAddress.phone_number).trim() !== '')
      ? defaultServerAddress.phone_number
      : (savedAddress?.phone || '');
  }, [defaultServerAddress, savedAddress?.phone]);

  // Robust address count: prefer server addresses; fallback to locally saved single address
  const addressCount = (authAddresses && Array.isArray(authAddresses))
    ? authAddresses.length
    : (savedAddress ? 1 : 0);

  // If any path tries to open the address popup while there's only one address,
  // automatically close it and open the map modal instead
  useEffect(() => {
    if (showAddressPopup && addressCount === 1) {
      setShowAddressPopup(false);
      setShowMapModal(true);
    }
  }, [showAddressPopup, addressCount]);

  // Load group order data from localStorage if joining a group
  useEffect(() => {
    const groupInfo = localStorage.getItem('groupOrderInfo');
    const groupCartItems = localStorage.getItem('groupOrderCartItems');
    const oldGroupCart = localStorage.getItem('groupOrderCart'); // Legacy support
    
    if (groupInfo && (groupCartItems || oldGroupCart)) {
      try {
        const parsedGroupInfo = JSON.parse(groupInfo);
        
        console.log('🎯 Loading group order data:', parsedGroupInfo);
        // Defensive: block invited checkout for leader
        try {
          const currentPhone = normalizePhone((user as any)?.phone_number || '');
          const leaderPhone = normalizePhone(parsedGroupInfo?.leader_phone || '');
          if (invitedParam === 'true' && currentPhone && leaderPhone && currentPhone === leaderPhone) {
            alert('شما لیدر این گروه هستید و نمی‌توانید به عنوان دعوت‌شده خرید کنید.');
            router.push(`/invite?authority=${encodeURIComponent(inviteCodeParam || '')}`);
            return;
          }
        } catch {}
        setGroupOrderInfo(parsedGroupInfo);
        // FIX: Use invitedParam from URL as the source of truth, fallback to localStorage
        setIsJoiningGroup(invitedParam === 'true' || parsedGroupInfo.is_joining_group || false);
        // RULE: If this checkout is for invited-led secondary group, force disable consolidation
        try {
          const kind = String(parsedGroupInfo?.kind || '').toLowerCase();
          const leaderIsInvited = parsedGroupInfo?.leader_is_invited === true;
          if (isInvitedUser && (kind === 'secondary' || leaderIsInvited)) {
            setForceDisableConsolidation(true);
            setGreenToggle(false);
          }
        } catch {}
        
        // Load cart items with prices if available
        if (groupCartItems) {
          const parsedCartItems = JSON.parse(groupCartItems);
          console.log('🛒 Loading group cart items with prices:', parsedCartItems);
          
          // Add each item to the cart context
          parsedCartItems.forEach((item: any) => {
            // The addItem function expects CartItem format
            const cartItem = {
              id: item.id,
              name: item.name,
              base_price: item.base_price,
              market_price: item.market_price,
              image: item.image,
              quantity: item.quantity
            };
            console.log('➕ Adding item to cart context:', cartItem);
            // Note: We'll need to use a different approach since we can't call addItem here
            // Instead, we'll store the items and load them after the cart context is ready
          });
          
          // Store the parsed items for later loading into cart context
          setGroupCartItems(parsedCartItems);
        } else if (oldGroupCart) {
          // Legacy support for old format
          const parsedGroupCart = JSON.parse(oldGroupCart);
          console.log('🛒 Loading legacy group cart format:', parsedGroupCart);
        }
        
        // Clear the localStorage after loading to prevent issues
        localStorage.removeItem('groupOrderCartItems');
        localStorage.removeItem('groupOrderCart');
        localStorage.removeItem('groupOrderInfo');
      } catch (error) {
        console.error('Error parsing group order data:', error);
      }
    }
  }, [invitedParam, isInvitedUser, router, inviteCodeParam]);

  // Load group cart items into cart context
  useEffect(() => {
    if (groupCartItems.length > 0 && addItem) {
      console.log('🔄 Loading group cart items into cart context...');
      try {
        // Prevent duplication when navigating back and forth
        clearCart && clearCart();
      } catch {}
      groupCartItems.forEach((item: any) => {
        const cartItem = {
          id: item.id,
          name: item.name,
          base_price: item.base_price,
          market_price: item.market_price,
          // Admin price fields
          solo_price: item.solo_price,
          friend_1_price: item.friend_1_price,
          friend_2_price: item.friend_2_price,
          friend_3_price: item.friend_3_price,
          image: item.image,
          quantity: 0 // Will be set by addItem
        };
        console.log('➕ Adding to cart:', cartItem);
        addItem(cartItem, item.quantity); // Add with actual quantity
        console.log(`✅ Item ${cartItem.name} added to cart with price ${cartItem.base_price} x${item.quantity}`);
      });
      // Clear the group cart items after loading
      setGroupCartItems([]);
    }
  }, [groupCartItems, addItem, clearCart]);

  // Load saved address from localStorage
  useEffect(() => {
    try {
      const uid = (user as any)?.id;
      // If authenticated, only read the per-user key to avoid leaking previous user's data
      const key = uid ? `userAddress_${uid}` : 'userAddress';
      const raw = uid ? localStorage.getItem(key) : localStorage.getItem('userAddress');
      if (raw) {
        setSavedAddress(JSON.parse(raw));
      }
    } catch (error) {
      console.error('Error loading saved address:', error);
    }
  }, [user?.id]);

  // Load addresses from AuthContext when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserAddresses();
      // Force refresh savedAddress after loading
      setTimeout(() => {
        const uid = (user as any)?.id;
        if (uid) {
          const cached = localStorage.getItem(`addresses_${uid}`);
          if (cached) {
            try {
              const list = JSON.parse(cached);
              if (Array.isArray(list) && list.length > 0) {
                const def = list.find((a: any) => a.is_default) || list[0];
                if (def) {
                  setSavedAddress({
                    fullAddress: def.full_address,
                    phone: def.phone_number,
                    details: def.receiver_name || '',
                    coordinates: { lat: def.latitude, lng: def.longitude }
                  });
                }
              }
            } catch {}
          }
        }
      }, 500);
    }
  }, [isAuthenticated, user, loadUserAddresses]);

  // Update saved address when AuthContext addresses change
  useEffect(() => {
    if (authAddresses && authAddresses.length > 0) {
      // Find default address from AuthContext
      const defaultAddress = authAddresses.find(addr => addr.is_default);
      if (defaultAddress) {
        const newSavedAddress = { 
          fullAddress: defaultAddress.full_address, 
          phone: defaultAddress.phone_number,
          details: defaultAddress.receiver_name || '',
          coordinates: { lat: defaultAddress.latitude, lng: defaultAddress.longitude }
        };
        setSavedAddress(newSavedAddress);
        try {
          const uid = (user as any)?.id;
          const key = uid ? `userAddress_${uid}` : 'userAddress';
          localStorage.setItem(key, JSON.stringify(newSavedAddress));
        } catch {}
      }
    }
  }, [authAddresses, user?.id]);

  // React to cross-tab storage events (from other windows/browsers on same device)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const uid = (user as any)?.id;
    const onStorage = async (e: StorageEvent) => {
      if (!e) return;
      const keysToWatch = new Set([
        'address_sync',
        uid ? `addresses_${uid}` : '',
        uid ? `userAddress_${uid}` : 'userAddress',
      ].filter(Boolean));
      if (!keysToWatch.has(e.key || '')) return;

      try {
        const res = await apiClient.get(`/users/addresses`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const def = list.find((a: any) => a.is_default) || list[0];
            const persisted = {
              fullAddress: def.full_address,
              phone: def.phone_number,
              details: def.receiver_name || ''
            } as any;
            setSavedAddress(persisted);
            try {
              const key = uid ? `userAddress_${uid}` : 'userAddress';
              localStorage.setItem(key, JSON.stringify(persisted));
              if (uid) localStorage.setItem(`addresses_${uid}`, JSON.stringify(list));
            } catch {}
          }
        }
      } catch {}
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isAuthenticated, user?.id]);

  // Fetch header details directly from server on mount/focus and when authAddresses change
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(`/users/addresses`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const def = list.find((a: any) => a.is_default) || list[0];
            setHeaderDetails(def?.receiver_name || '');
          }
        }
      } catch {}
    };

    fetchDetails();
    const onFocus = () => fetchDetails();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isAuthenticated, user?.id, authAddresses?.length]);

  // If user is authenticated but has no server addresses yet, and there is a locally saved checkout address,
  // automatically create a real server-backed address so it persists across browsers/sessions
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!savedAddress) return;
    if (authAddresses && authAddresses.length > 0) return;

    const createFromSaved = async () => {
      try {
        const payload: any = {
          title: 'آدرس سبد خرید',
          full_address: savedAddress.fullAddress,
          postal_code: '0000000000',
          receiver_name: savedAddress.details || '',
          phone_number: savedAddress.phone,
          latitude: savedAddress.coordinates?.lat,
          longitude: savedAddress.coordinates?.lng,
          is_default: true,
        };
        const ok = await addUserAddress(payload);
        if (ok) {
          try { await loadUserAddresses(); } catch {}
        }
      } catch {}
    };

    createFromSaved();
  }, [isAuthenticated, user?.id, savedAddress, authAddresses?.length, addUserAddress, loadUserAddresses]);

  // On login, try to hydrate from cached addresses if present (fast path before server fetch)
  useEffect(() => {
    const uid = (user as any)?.id;
    if (!uid) return;
    try {
      const cached = localStorage.getItem(`addresses_${uid}`);
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list) && list.length > 0) {
          const def = list.find((a: any) => a.is_default) || list[0];
          if (def) {
            const persisted = {
              fullAddress: def.full_address,
              phone: def.phone_number,
              details: def.receiver_name || ''
            };
            setSavedAddress(persisted as any);
            try { localStorage.setItem(`userAddress_${uid}`, JSON.stringify(persisted)); } catch {}
          }
        }
      }
    } catch {}
  }, [user?.id]);

  // On tab focus/visibility, force-refresh addresses from server and hydrate savedAddress + cache
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const refreshFromServer = async () => {
      try {
        const res = await apiClient.get(`/users/addresses`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const def = list.find((a: any) => a.is_default) || list[0];
            const persisted = {
              fullAddress: def.full_address,
              phone: def.phone_number,
              details: ''
            } as any;
            setSavedAddress(persisted);
            try {
              const uid = (user as any)?.id;
              const key = uid ? `userAddress_${uid}` : 'userAddress';
              localStorage.setItem(key, JSON.stringify(persisted));
              if (uid) {
                localStorage.setItem(`addresses_${uid}`, JSON.stringify(list));
              }
            } catch {}
          }
        }
      } catch {}
    };

    const onFocus = () => {
      refreshFromServer();
    };
    const onVisibility = () => {
      if (!document.hidden) refreshFromServer();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, user?.id]);

  // Safety net: if authenticated on a fresh browser and no savedAddress yet,
  // fetch addresses directly and hydrate from the server (handles race/cache misses)
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (savedAddress) return;
    if (authAddresses && authAddresses.length > 0) return;

    (async () => {
      try {
        const res = await apiClient.get(`/users/addresses`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const def = data.find((a: any) => a.is_default) || data[0];
            const persisted = {
              fullAddress: def.full_address,
              phone: def.phone_number,
              details: ''
            } as any;
            setSavedAddress(persisted);
            try {
              const uid = (user as any)?.id;
              const key = uid ? `userAddress_${uid}` : 'userAddress';
              localStorage.setItem(key, JSON.stringify(persisted));
              if (uid) {
                localStorage.setItem(`addresses_${uid}`, JSON.stringify(data));
              }
            } catch {}
          }
        }
      } catch {}
    })();
  }, [isAuthenticated, user?.id, savedAddress, authAddresses?.length]);

  // Ticker animation
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simple approach: fetch leader's toggle state for invited users
  useEffect(() => {
    const isInvited = invitedParam === 'true';
    
    if (!isInvited) {
      return;
    }

    // Get invite code from any available source
    const inviteCode = inviteCodeParam || groupOrderInfo?.invite_code;
    
    if (inviteCode) {
      console.log('🔍 Fetching leader toggle state for invite:', inviteCode);
      
      fetch(`/api/group-invite/${encodeURIComponent(inviteCode)}`)
        .then(response => response.json())
        .then(data => {
          const leaderToggleState = data.allow_consolidation === true;
          console.log('✅ Leader toggle state:', leaderToggleState);
          setLeaderAllowsConsolidation(leaderToggleState);
        })
        .catch(error => {
          console.error('❌ Failed to fetch leader toggle state:', error);
          setLeaderAllowsConsolidation(false);
        });
    }
  }, [invitedParam, inviteCodeParam, groupOrderInfo?.invite_code]);

  // Simple toggle visibility logic
  // Show for leaders always. For invited users, only if leader enabled it AND this is not a secondary group
  const shouldShowToggle = actualMode === 'group' && (
    !isInvitedUser || (leaderAllowsConsolidation && !forceDisableConsolidation)
  );

  console.log('🧮 Simple toggle decision:', {
    actualMode,
    isInvitedUser,
    leaderAllowsConsolidation,
    shouldShowToggle,
  });

  // Calculations based on mode and cart context
  const calculations = useMemo(() => {
    // For invited users joining a group, originalPrice should be solo_price (market_price)
    // For regular users, originalPrice should be base_price
    let originalPrice: number;
    if (isJoiningGroup) {
      // For group joining users, use market_price as original (solo_price)
      originalPrice = items.reduce((s, p) => s + (p.market_price || p.base_price) * p.quantity, 0);
    } else {
      // For regular users, use base_price as original
      originalPrice = getSingleBuyTotal();
    }
    
    // Use appropriate price based on actualMode and cart context
    let currentPrice: number;
    if (actualMode === 'solo') {
      currentPrice = getSingleBuyTotal();
    } else {
      // For group mode, check if we have flexible payment parameters
      if (paymentAmountParam && paymentPercentageParam && friendPriceParam) {
        // Use the flexible payment amount from cart
        currentPrice = parseInt(paymentAmountParam);
      } else if (isJoiningGroup) {
        // For invited users joining a group, use base_price (friend_1_price)
        currentPrice = getSingleBuyTotal(); // This uses base_price which is friend_1_price
      } else {
        // Use the same logic as cart for backward compatibility
        let friends = friendsParam ? parseInt(friendsParam) : 1; // default to 1 friend if not specified
        // Clamp 0-friends to 1-friend for group pricing
        if (friends === 0) friends = 1;
        const maxFriends = maxFriendsParam ? parseInt(maxFriendsParam) : 3; // default to 3 if not specified
        
        // Calculate base friend price (50% of original)
        const withFriend = items.reduce(
          (s, p) =>
            s + (p.friend_1_price ?? Math.round(p.base_price * 0.5)) * p.quantity,
          0,
        );
        
        // Apply group discount logic based on friends count - same as cart
        if (friends === maxFriends) {
          currentPrice = 0; // Free when reaching max friends
        } else if (friends === 1) {
          currentPrice = withFriend; // Use friend price for 1 friend (50% of original)
        } else {
          // Calculate price based on friends count - same logic as cart
          const calculatedPrice = Math.round(originalPrice / (friends + 1));
          // If calculated price is 0 or negative, make it free
          currentPrice = calculatedPrice <= 0 ? 0 : calculatedPrice;
        }
      }
    }
    
    // Calculate wallet usage up to current price amount
    // Use wallet balance if payment method is 'wallet' (for hybrid payment)
    const walletUse = paymentMethod === 'wallet' ? Math.min(currentPrice, walletBalance) : 0;
    const savings = actualMode === 'group' ? (originalPrice - currentPrice) + walletUse : walletUse;
    // Consolidation discount for invited users when toggle is ON
    const consolidationDiscount = (isInvitedUser && greenToggle) ? 10000 : 0;
    const total = Math.max(0, currentPrice - walletUse - consolidationDiscount);

    // Free if final total is zero (legacy behavior)

    return {
      originalPrice,
      currentPrice,
      walletUse,
      savings,
      total,
      consolidationDiscount,
      isFree: total === 0,
      // Store flexible payment info for backend
      paymentPercentage: paymentPercentageParam ? parseInt(paymentPercentageParam) : 100,
      friendPrice: friendPriceParam ? parseInt(friendPriceParam) : 0
    };
  }, [items, actualMode, paymentMethod, getSingleBuyTotal, friendsParam, maxFriendsParam, paymentAmountParam, paymentPercentageParam, friendPriceParam, isJoiningGroup, isInvitedUser, greenToggle, walletBalance]);

  const hasAddress = savedAddress !== null;

  // Resolve the displayed details robustly from multiple sources
  const displayedDetails = useMemo(() => {
    // Always prioritize AuthContext (server truth) for real-time updates
    const def = (authAddresses && authAddresses.length > 0)
      ? (authAddresses.find(a => a.is_default) || authAddresses[0])
      : null;
    const fromAuth = def?.receiver_name;
    if (fromAuth && String(fromAuth).trim() !== '') return fromAuth;

    // Fallback to saved details
    const direct = savedAddress?.details;
    if (direct && String(direct).trim() !== '') return direct;

    // Final fallback: LocalStorage addresses cache
    try {
      const uid = (user as any)?.id;
      if (uid) {
        const cached = localStorage.getItem(`addresses_${uid}`);
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list) && list.length > 0) {
            const def2 = list.find((a: any) => a.is_default) || list[0];
            const fromCache = def2?.receiver_name;
            if (fromCache && String(fromCache).trim() !== '') return fromCache;
          }
        }
      }
    } catch {}

    return '';
  }, [authAddresses, savedAddress?.details, user?.id]);

  const confirmSlot = () => {
    const labels = availableSlotLabels;
    if (!labels || labels.length === 0) {
      setShowShipPopup(false);
      return;
    }
    const safeIndex = Math.min(Math.max(0, tempChosenSlot), labels.length - 1);
    if (useAdminTomorrowSlots) {
      setSelectedSlot(`${tomorrowLabelPrefix} ${labels[safeIndex]}`);
    } else {
      const safeDay = days.find(d => d.id === chosenDay) || days[0];
      setSelectedSlot(`${safeDay.label}، ${labels[safeIndex]}`);
    }
    setChosenSlot(tempChosenSlot);
    setShowShipPopup(false);
  };

  const handleEditAddress = () => {
    // If zero or one address, go straight to map (create/edit)
    if (addressCount <= 1) {
      setShowMapModal(true);
      return;
    }
    // Multiple addresses → open list
    setShowAddressPopup(true);
  };

  const handleAddAddress = () => {
    setShowAddressPopup(false);
    setShowMapModal(true);
  };

  const handleDeleteAddr = async (id: string | number) => {
    if(authAddresses && authAddresses.length === 1){ 
      alert('حداقل یک آدرس باید داشته باشید'); 
      return; 
    }
    
    // Use AuthContext delete function
    const success = await deleteUserAddress(id.toString());
    if (success) {
      // Addresses will be updated automatically through AuthContext
      console.log('Address deleted successfully');
    } else {
      alert('خطا در حذف آدرس');
    }
  };
  const handleSetMain = async (id: string | number) => {
    // Find the address to set as default
    const addressToUpdate = authAddresses?.find(addr => addr.id?.toString() === id.toString());
    if (addressToUpdate) {
      const success = await updateUserAddress(id.toString(), { ...addressToUpdate, is_default: true });
      if (success) {
        console.log('Default address updated successfully');
        // Persist new default locally for immediate UX and refresh resilience
        const persisted = {
          fullAddress: addressToUpdate.full_address,
          phone: addressToUpdate.phone_number,
          details: addressToUpdate.receiver_name || ''
        };
        setSavedAddress(persisted as any);
        try {
          const uid = (user as any)?.id;
          const key = uid ? `userAddress_${uid}` : 'userAddress';
          localStorage.setItem(key, JSON.stringify(persisted));
        } catch {}
      } else {
        alert('خطا در به‌روزرسانی آدرس');
      }
    }
  };
  const handleEditAddr = async () => {
    try {
      setShowAddressPopup(false);
      // Fetch freshest addresses from server to avoid stale details
      const res = await apiClient.get(`/users/addresses`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const def = list.find((a: any) => a.is_default) || list[0];
          setModalInit({
            fullAddress: def?.full_address,
            details: def?.receiver_name,
            phone: def?.phone_number,
            coordinates: (typeof def?.latitude === 'number' && typeof def?.longitude === 'number')
              ? { lat: def.latitude, lng: def.longitude }
              : savedAddress?.coordinates,
          });
        } else {
          setModalInit({
            fullAddress: savedAddress?.fullAddress,
            details: savedAddress?.details,
            phone: savedAddress?.phone,
            coordinates: savedAddress?.coordinates,
          });
        }
      } else {
        setModalInit({
          fullAddress: savedAddress?.fullAddress,
          details: savedAddress?.details,
          phone: savedAddress?.phone,
          coordinates: savedAddress?.coordinates,
        });
      }
    } catch {
      setModalInit({
        fullAddress: savedAddress?.fullAddress,
        details: savedAddress?.details,
        phone: savedAddress?.phone,
        coordinates: savedAddress?.coordinates,
      });
    } finally {
      setShowMapModal(true);
    }
  };

  // Handle address save from new map modal (modal already saves to server)
  const handleAddressSave = async (addressData: {
    fullAddress: string;
    details: string;
    phone: string;
    lat: number;
    lng: number;
  }) => {
    // Update local UI immediately
    setSavedAddress({
      fullAddress: addressData.fullAddress,
      details: addressData.details,
      phone: addressData.phone,
      coordinates: { lat: addressData.lat, lng: addressData.lng },
    });

    // Close modal first for better UX
    setShowMapModal(false);

    // Now refresh from server to get the actual saved data (including receiver_name)
    if (isAuthenticated && user) {
      try {
        await loadUserAddresses(); // This will trigger the authAddresses useEffect
        
        // Also directly fetch and update savedAddress from server
        const res = await apiClient.get(`/users/addresses`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const def = list.find((a: any) => a.is_default) || list[list.length - 1]; // Get latest or default
            const persisted = {
              fullAddress: def.full_address,
              phone: def.phone_number,
              details: def.receiver_name || ''
            };
            setSavedAddress(persisted);
            
            // Update localStorage with server data
            const uid = (user as any)?.id;
            const key = uid ? `userAddress_${uid}` : 'userAddress';
            localStorage.setItem(key, JSON.stringify(persisted));
            if (uid) {
              localStorage.setItem(`addresses_${uid}`, JSON.stringify(list));
            }
          }
        }
      } catch (error) {
        console.error('Error refreshing addresses after save:', error);
      }
    } else {
      // Fallback for non-authenticated users
      try {
        const uid = (user as any)?.id;
        const key = uid ? `userAddress_${uid}` : 'userAddress';
        localStorage.setItem(key, JSON.stringify({
          fullAddress: addressData.fullAddress,
          details: addressData.details,
          phone: addressData.phone,
        }));
      } catch {}
    }
  };



  // Payment handler
  const handlePayment = async () => {
    console.log('🚀 Payment button clicked');
    console.log('📊 Calculations:', calculations);
    console.log('💳 Payment method:', paymentMethod);
    console.log('🏠 Has address:', hasAddress);
    
    const canProceedWithoutAddress = isInvitedUser && greenToggle;
    if (!hasAddress && !canProceedWithoutAddress) {
      alert('لطفاً ابتدا آدرس خود را انتخاب کنید');
      return;
    }

    if (calculations.isFree) {
      // Handle free order - create order and redirect to invite page
      try {
        const orderItems = items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: 0, // Free items
          name: item.name,
          image: item.image,
          description: `توضیحات ${item.name}`,
          market_price: item.market_price,
          friend_1_price: item.friend_1_price
        }));
        
        const response = await fetch('/api/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 0,
            description: `سفارش رایگان - ${items.length} کالا`,
            mobile: (user as any)?.phone_number || savedAddress?.phone,
            shipping_address: JSON.stringify({
              full_address: savedAddress?.fullAddress || defaultServerAddress?.full_address || '',
              details: savedAddress?.details || defaultServerAddress?.receiver_name || '',
              postal_code: defaultServerAddress?.postal_code || '',
              phone_number: (user as any)?.phone_number || savedAddress?.phone || ''
            }),
            delivery_slot: selectedSlot,
            items: orderItems,
            // Include flexible payment info for backend tracking
            paymentPercentage: calculations.paymentPercentage,
            friendPrice: calculations.friendPrice,
            isFlexiblePayment: paymentAmountParam ? true : false,
            // Ensure group pre-creation on backend for free-flow
            mode: isInvitedUser ? undefined : actualMode,
            // Pass toggle state for group consolidation
            allow_consolidation: (forceDisableConsolidation ? false : greenToggle),
            // Pass expected friends count for settlement tracking
            expected_friends: (!isInvitedUser && expectedFriendsParam) ? parseInt(expectedFriendsParam) : undefined,
            // Ensure invite linking for invited users
            invite_code: inviteCodeParam || groupOrderInfo?.invite_code || undefined,
          }),
        });

        const data = await response.json();

        if (data.success && data.authority) {
          // Redirect to invite page with authority
          router.push(`/invite?authority=${data.authority}`);
        } else {
          alert('خطا در ثبت سفارش رایگان');
        }
      } catch (error) {
        console.error('Free order error:', error);
        alert('خطا در ثبت سفارش');
      }
      return;
    }

    if (paymentMethod === 'wallet') {
      // Handle wallet payment
      if (calculations.total <= 0) {
        // If total is 0 or negative (fully covered by wallet), complete the order
        try {
          const orderItems = items.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.base_price, // Use original prices for wallet payment
            name: item.name,
            image: item.image,
            description: `توضیحات ${item.name}`,
            market_price: item.market_price,
            friend_1_price: item.friend_1_price
          }));
          
          const response = await fetch('/api/payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: 0,
              description: `پرداخت از کیف پول - ${items.length} کالا`,
              mobile: (user as any)?.phone_number || savedAddress?.phone,
              shipping_address: JSON.stringify({
                full_address: savedAddress?.fullAddress || defaultServerAddress?.full_address || '',
                details: savedAddress?.details || defaultServerAddress?.receiver_name || '',
                postal_code: defaultServerAddress?.postal_code || '',
                phone_number: (user as any)?.phone_number || savedAddress?.phone || ''
              }),
              delivery_slot: selectedSlot,
              items: orderItems,
              // Include flexible payment info for backend tracking
              paymentPercentage: calculations.paymentPercentage,
              friendPrice: calculations.friendPrice,
              isFlexiblePayment: paymentAmountParam ? true : false,
              // Pass purchase mode to backend so it can pre-create GroupOrder for admin visibility
              mode: isInvitedUser ? undefined : actualMode,
              // Pass toggle state for group consolidation
              allow_consolidation: (forceDisableConsolidation ? false : greenToggle),
              // Pass expected friends count for settlement tracking (leaders only)
              expected_friends: (!isInvitedUser && expectedFriendsParam) ? parseInt(expectedFriendsParam) : undefined,
              // Ensure invite linking for invited users
              invite_code: inviteCodeParam || groupOrderInfo?.invite_code || undefined,
            }),
          });

          const data = await response.json();

          if (data.success && data.authority) {
            // Redirect to invite page with authority
            router.push(`/invite?authority=${data.authority}`);
          } else {
            alert('خطا در ثبت سفارش با کیف پول');
          }
        } catch (error) {
          console.error('Wallet payment error:', error);
          alert('خطا در پرداخت از کیف پول');
        }
        return;
      } else {
        // If wallet balance is not enough for full payment, proceed to gateway for remaining amount
        // Hybrid payment: we will send ONLY the remaining amount to backend so it forwards correct value to ZarinPal
        try {
          const amountInRial = calculations.total * 10;

          // For invited users, include items + invite_code so backend can link to existing group
          const inviteAwareBody = async () => {
            if (!isInvitedUser) {
              return {
                amount: amountInRial,
                description: `پرداخت سفارش (بخشی از کیف پول) - ${items.length} کالا`,
                mobile: (user as any)?.phone_number || savedAddress?.phone,
                email: undefined,
                // IMPORTANT: do NOT include items – this forces the API route to call /request-public
              } as any;
            }
            // Build items for invited flow
            const hybridItems = items.map(item => ({
              product_id: item.id,
              quantity: item.quantity,
              price: item.base_price,
              name: item.name,
              image: item.image,
              description: `توضیحات ${item.name}`,
              market_price: item.market_price,
              friend_1_price: item.friend_1_price
            }));
            return {
              amount: amountInRial,
              description: `پرداخت سفارش (بخشی از کیف پول) - ${items.length} کالا`,
              mobile: (user as any)?.phone_number || savedAddress?.phone,
              shipping_address: JSON.stringify({
                full_address: savedAddress?.fullAddress || defaultServerAddress?.full_address || '',
                details: savedAddress?.details || defaultServerAddress?.receiver_name || '',
                postal_code: defaultServerAddress?.postal_code || '',
                phone_number: (user as any)?.phone_number || savedAddress?.phone || ''
              }),
              delivery_slot: selectedSlot,
              items: hybridItems,
              // Forward invite info to ensure linking
              invite_code: inviteCodeParam || groupOrderInfo?.invite_code || undefined,
              // Avoid creating new group for invitees
              mode: undefined,
              allow_consolidation: (forceDisableConsolidation ? false : greenToggle),
            } as any;
          };

          const response = await fetch('/api/payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...(await inviteAwareBody()),
              // Leaders hybrid flow: forward expected friends if present
              expected_friends: (!isInvitedUser && expectedFriendsParam) ? parseInt(expectedFriendsParam) : undefined,
            }),
          });

          const data = await response.json();
          console.log('🔍 Hybrid Payment API Response:', data);

          if (data.success && data.payment_url) {
            console.log('✅ Redirecting to payment gateway (hybrid):', data.payment_url);
            
            // Persist ship-to-leader intent for invitees when toggle is ON
            if (isJoiningGroup && greenToggle && !forceDisableConsolidation) {
              try { localStorage.setItem('ship_to_leader_intent', '1'); } catch {}
            }
            
            // Redirect to payment gateway (will return to Telegram Mini App after payment)
            window.location.href = data.payment_url;
          } else {
            console.error('❌ Hybrid payment failed:', data);
            alert(data.error || 'خطا در اتصال به درگاه پرداخت');
          }
        } catch (error) {
          console.error('Hybrid payment error:', error);
          alert('خطا در اتصال به درگاه پرداخت');
        }
        return;
      }
    }

    // For gateway payment or hybrid payment (wallet + gateway), proceed with the total amount

    // Gateway payment
    try {
      // Convert total from Toman to Rial (multiply by 10)
      const amountInRial = calculations.total * 10;
      
      console.log('💰 Checkout sending to payment API:', {
        amountInToman: calculations.total,
        amountInRial: amountInRial,
        paymentAmountParam: paymentAmountParam,
        calculationsUsed: calculations
      });
      
      // Prepare items for order creation with correct prices (strictly use admin-defined fields)
      const orderItems = items.map(item => {
        let friends = friendsParam ? parseInt(friendsParam) : 1;
        if (friends === 0) friends = 1; // Clamp 0 to 1 friend for pricing
        const maxFriends = maxFriendsParam ? parseInt(maxFriendsParam) : 3;

        // Derive per-item price based on selected friends
        let itemPrice: number;
        if (actualMode !== 'group') {
          // Solo mode: use solo/market price
          itemPrice = (item as any).solo_price ?? (item as any).market_price ?? (item as any).base_price;
        } else if (friends >= maxFriends) {
          itemPrice = 0;
        } else if (friends === 2) {
          itemPrice = (item as any).friend_2_price ?? Math.round(((item as any).solo_price ?? (item as any).market_price ?? (item as any).base_price) / 4);
        } else if (friends === 1) {
          itemPrice = (item as any).friend_1_price ?? Math.round(((item as any).solo_price ?? (item as any).market_price ?? (item as any).base_price) / 2);
        } else {
          // Fallback for unexpected counts
          itemPrice = (item as any).friend_1_price ?? Math.round(((item as any).solo_price ?? (item as any).market_price ?? (item as any).base_price) / 2);
        }

        return {
          product_id: item.id,
          quantity: item.quantity,
          price: itemPrice,
          name: item.name,
          image: item.image,
          description: `توضیحات ${item.name}`,
          market_price: item.market_price,
          friend_1_price: item.friend_1_price
        };
      });
      
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInRial,
          description: `پرداخت سفارش - ${items.length} کالا`,
          mobile: (user as any)?.phone_number || savedAddress?.phone,
          shipping_address: JSON.stringify({
            full_address: savedAddress?.fullAddress || defaultServerAddress?.full_address || '',
            details: savedAddress?.details || defaultServerAddress?.receiver_name || '',
            postal_code: defaultServerAddress?.postal_code || '',
            phone_number: (user as any)?.phone_number || savedAddress?.phone || ''
          }),
          delivery_slot: selectedSlot,
          items: orderItems, // Include items with correct prices
          invite_code: inviteCodeParam || groupOrderInfo?.invite_code || undefined,
          // Include flexible payment info for backend tracking
          paymentPercentage: calculations.paymentPercentage,
          friendPrice: calculations.friendPrice,
          isFlexiblePayment: paymentAmountParam ? true : false,
          // Pass purchase mode to backend so it can pre-create GroupOrder for admin visibility
          mode: isInvitedUser ? undefined : actualMode,
          // Pass toggle state for group consolidation
          allow_consolidation: (forceDisableConsolidation ? false : greenToggle),
          // Pass expected friends count for settlement tracking (leaders only)
          expected_friends: (!isInvitedUser && expectedFriendsParam) ? parseInt(expectedFriendsParam) : undefined,
        }),
      });

      const data = await response.json();
      console.log('🔍 Payment API Response:', data);

      if (data.success && data.payment_url) {
        console.log('✅ Redirecting to payment gateway:', data.payment_url);
        
        // Redirect to payment gateway (will return to Telegram Mini App after payment)
        window.location.href = data.payment_url;
      } else {
        console.error('❌ Payment failed:', data);
        alert(data.error || 'خطا در اتصال به درگاه پرداخت');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('خطا در اتصال به درگاه پرداخت');
    }
  };

  // Fetch next day delivery slots from admin when required (invited, solo, or leaders)
  useEffect(() => {
    if (!useAdminTomorrowSlots) return;
    
    let abort = false;
    (async () => {
      try {
        // Try to get server time (optional)
        let nowStr: string | undefined;
        try {
          const nowRes = await fetch(`${API_BASE_URL}/time/now`, { cache: 'no-store' });
          if (nowRes.ok) {
            const nowJson = await nowRes.json().catch(() => ({}));
            nowStr = nowJson?.now;
          }
        } catch {}

        // Compute today in Tehran regardless of server time presence
        const toTehranIso = (input: Date | string) =>
          new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Tehran',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(typeof input === 'string' ? new Date(input) : input);

        const addDaysIso = (iso: string, n: number) => {
          const [y, m, d] = iso.split('-').map(Number);
          const dt = new Date(Date.UTC(y, m - 1, d));
          dt.setUTCDate(dt.getUTCDate() + n);
          return dt.toISOString().slice(0, 10);
        };

        const todayIsoTehran = nowStr ? toTehranIso(nowStr) : toTehranIso(new Date());
        
        // Leaders get day after tomorrow, invited/solo users get tomorrow
        const targetDayOffset = isLeaderGroup ? 2 : 1;
        const tIso = addDaysIso(todayIsoTehran, targetDayOffset);

        if (abort) return;
        setTomorrowIso(tIso);

        // Set label based on user type
        const labelPrefix = isLeaderGroup ? 'پس فردا' : 'فردا';
        setTomorrowLabelPrefix(labelPrefix);

        // Fetch enough days to cover both tomorrow and day after tomorrow
        const slotsRes = await fetch(`${API_BASE_URL}/admin/delivery-slots/next?days=3`, { cache: 'no-store' });
        const slotsJson = await slotsRes.json().catch(() => ({}));
        const daysArr: any[] = Array.isArray(slotsJson?.days) ? slotsJson.days : [];

        // Find the target day (tomorrow for invited/solo, day after tomorrow for leaders)
        let targetDay: any = daysArr.find((d: any) => String(d?.date) === tIso) || null;

        if (abort) return;

        if (targetDay?.day_off) {
          setTomorrowSlotObjs([]);
          setTomorrowSlotLabels([]);
          setSelectedSlot(`${labelPrefix} تعطیل است`);
          return;
        }

        const activeSlots: Array<{ start_time: string; end_time: string }> = (targetDay?.slots || [])
          .filter((s: any) => s && s.is_active)
          .map((s: any) => ({ start_time: String(s.start_time), end_time: String(s.end_time) }));

        if (abort) return;

        setTomorrowSlotObjs(activeSlots);
        const labels = activeSlots.map(s => `${hhToLabel(s.start_time)} تا ${hhToLabel(s.end_time)}`);
        setTomorrowSlotLabels(labels);

        if (!hasSetDefaultSlot) {
          if (labels.length > 0) {
            setSelectedSlot(`${labelPrefix} ${labels[0]}`);
            setChosenDay(0);
            setChosenSlot(0);
          } else {
            setSelectedSlot(`${labelPrefix} بازه‌ای در دسترس نیست`);
          }
          setHasSetDefaultSlot(true);
        }
      } catch (e) {
        console.error('Error fetching delivery slots:', e);
        // Enforce invited rule: no static fallback for invited users
        if (!hasSetDefaultSlot) {
          setTomorrowSlotObjs([]);
          setTomorrowSlotLabels([]);
          setSelectedSlot('');
          setHasSetDefaultSlot(true);
        }
      }
    })();
    
    return () => { abort = true; };
  }, [useAdminTomorrowSlots, API_BASE_URL, tomorrowLabelPrefix, hhToLabel]);

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', direction: 'rtl' }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#fff',
        borderBottom: '1px solid #e0e0e0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button 
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer'
          }}
        >
          &#x2192;
        </button>
        <div 
          onClick={() => {
            console.log('Ticker clicked');
            setShowHeaderPopup(true);
          }}
          style={{
            flex: 1,
            overflow: 'hidden',
            height: '24px',
            position: 'relative',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          {tickerMessages.map((msg, index) => (
            <span
              key={index}
              style={{
                position: 'absolute',
                width: '100%',
                right: 0,
                transform: index === tickerIndex ? 'translateY(0)' : 'translateY(-100%)',
                opacity: index === tickerIndex ? 1 : 0,
                transition: '0.6s ease'
              }}
            >
              {msg}
            </span>
          ))}
        </div>
      </header>

      {/* Invited User Indicator: removed */}
      {false && (
        <div />
      )}

      {/* Group Joining Indicator: removed */}
      {false && (
        <section />
      )}

      {/* Address */}
      <section style={{
        margin: '12px',
        background: '#fff',
        borderRadius: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.85rem'
      }}>
        {hasAddress ? (
          <>
            <div>
              <p style={{ margin: 0, marginBottom: '4px' }}>{savedAddress.fullAddress}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                {headerDetails || displayedDetails}
              </p>
            </div>
            <button
              onClick={handleEditAddress}
              style={{
                color: '#E31C5F',
                textDecoration: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ویرایش آدرس
            </button>
          </>
        ) : (
          <button
            onClick={handleAddAddress}
            style={{
              color: '#E31C5F',
              textDecoration: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500,
              width: '100%',
              textAlign: 'center'
            }}
          >
            + افزودن آدرس
          </button>
        )}
      </section>

      {/* Toggle Section for Invited Users */}
      {shouldShowToggle && (
        <section style={{
          background: '#fff',
          margin: '8px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          padding: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px',
            fontSize: '0.8rem'
          }}>
            <div style={{ fontSize: '1.2rem' }}>💰</div>
            <div style={{ flex: 1 }}>
              {isInvitedUser ? (
                greenToggle ? (
                  <>
                    <p style={{ margin: 0, lineHeight: 1.4 }}>ارسال سفارشت به آدرس سرگروه فعال شد</p>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, lineHeight: 1.4 }}>سفارشت رو به آدرس سرگروه بفرست.</p>
                    <p style={{ margin: 0, lineHeight: 1.4 }}>10 هزار تومان تخفیف بگیر!</p>
                  </>
                )
              ) : (
                greenToggle ? (
                  <>
                    <p style={{ margin: 0, lineHeight: 1.4 }}>امکان ارسال سفارش دوستانت به تو فعال شد</p>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, lineHeight: 1.4 }}>سفارش دوستانت رو دریافت کن</p>
                    <p style={{ margin: 0, lineHeight: 1.4 }}>حداقل 10 هزار تومان تخفیف بگیر!</p>
                  </>
                )
              )}
            </div>
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '44px',
              height: '22px'
            }}>
              <input
                type="checkbox"
                checked={greenToggle}
                onChange={(e) => setGreenToggle(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: greenToggle ? '#E31C5F' : '#ccc',
                borderRadius: '22px',
                transition: '0.3s',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{
                  content: '""',
                  position: 'absolute',
                  height: '18px',
                  width: '18px',
                  left: greenToggle ? '22px' : '2px',
                  bottom: '2px',
                  background: '#fff',
                  borderRadius: '50%',
                  transition: '0.3s'
                }}></span>
              </span>
            </label>
          </div>
        </section>
      )}

      {/* Shipping */}
      <section style={{
        background: '#fff',
        margin: '12px',
        borderRadius: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e0e0e0',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span>هزینه ارسال:</span>
            <span style={{ color: '#00c853', fontWeight: 700 }}>رایگان</span>
          </div>
          {/* Delivery time: for invited + consolidation ON, hide picker and show message; otherwise show for all users including leaders */}
          {(isInvitedUser && greenToggle) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>زمان ارسال سفارش را سرگروه مشخص می‌کند</span>
              <button
                onClick={() => setShowInvitedShipInfoPopup(true)}
                aria-label="توضیحات زمان ارسال توسط سرگروه"
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '1px solid #999',
                  color: '#666',
                  background: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  lineHeight: 1,
                  cursor: 'pointer'
                }}
              >؟</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>زمان ارسال: {selectedSlot || '—'}</span>
              <button
                onClick={() => {
                  setTempChosenSlot(0); // Reset temp slot when opening popup
                  setShowShipPopup(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#E31C5F',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                تغییر زمان
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Payment Method */}
      {walletBalance > 0 && (
      <section style={{
        background: '#fff',
        margin: '12px',
        borderRadius: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        padding: '16px'
      }}>
        <h2 style={{ margin: '0 0 13px', fontSize: '0.95rem' }}>روش پرداخت</h2>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 0',
          cursor: 'pointer',
          fontSize: '0.85rem'
        }}>
          <input
            type="radio"
            name="payMethod"
            value="gateway"
            checked={paymentMethod === 'gateway'}
            onChange={() => setPaymentMethod('gateway')}
            style={{
              accentColor: '#E31C5F',
              margin: 0,
              width: '18px',
              height: '18px'
            }}
          />
          <span style={{ flex: 1 }}>پرداخت اینترنتی (کارت بانکی)</span>
        </label>
        {walletBalance > 0 && (
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 0',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}>
            <input
              type="radio"
              name="payMethod"
              value="wallet"
              checked={paymentMethod === 'wallet'}
              onChange={() => setPaymentMethod('wallet')}
              style={{
                accentColor: '#E31C5F',
                margin: 0,
                width: '18px',
                height: '18px'
              }}
            />
            <span style={{ flex: 1 }}>
              پرداخت از کیف پول
              <span style={{ color: '#00c853', fontSize: '0.8rem', marginRight: '4px' }}>
                (موجودی: {formatPrice(walletBalance)})
              </span>
            </span>
          </label>
        )}
      </section>
      )}

      {/* Order Summary */}
      <section style={{
        background: '#fff',
        margin: '12px',
        borderRadius: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        padding: '16px',
        fontSize: '0.85rem',
        maxHeight: '60vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '0.95rem',
            fontWeight: 500,
            color: '#666'
          }}>خلاصه سفارش</h3>
          <button
            onClick={() => setShowBasketPopup(true)}
            style={{
              fontSize: '0.85rem',
              color: '#E31C5F',
              textDecoration: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            مشاهده کالاها
          </button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
          {actualMode === 'group' && (
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>قیمت اصلی کالاها</span>
              <span>{formatPrice(calculations.originalPrice)}</span>
            </li>
          )}
          <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>{actualMode === 'solo' ? 'قیمت کالاها' : 'قیمت کالاها با خرید گروهی'}</span>
            <span>{formatPrice(calculations.currentPrice)}</span>
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>هزینه ارسال</span>
            <span>رایگان</span>
          </li>
          {calculations.consolidationDiscount > 0 && (
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>تخفیف تجمیع سفارش</span>
              <span style={{ color: '#e53935' }}>−{formatPrice(calculations.consolidationDiscount)}</span>
            </li>
          )}
          {calculations.walletUse > 0 && (
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>کسر از کیف پول</span>
              <span>−{formatPrice(calculations.walletUse)}</span>
            </li>
          )}
          {calculations.savings > 0 && (
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>سود شما از این خرید</span>
              <span style={{ color: '#00c853' }}>{formatPrice(calculations.savings)}</span>
            </li>
          )}
        </ul>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 700
        }}>
          <span>جمع کل</span>
          <strong>{calculations.isFree ? 'رایگان' : formatPrice(calculations.total)}</strong>
        </div>
      </section>

      {/* Bottom Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9,
        background: '#fff',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '13px 16px'
      }}>
        <div 
          onClick={() => setShowSummaryPopup(true)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{
            fontSize: '0.75rem',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}>
            مبلغ قابل پرداخت <span style={{ fontSize: '0.65rem' }}>▲</span>
          </div>
          <div style={{
            fontWeight: 700,
            marginTop: '2px',
            fontSize: '0.9rem'
          }}>{calculations.isFree ? 'رایگان' : formatPrice(calculations.total)}</div>
        </div>
        <button
          onClick={handlePayment}
          style={{
            background: '#E31C5F',
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            padding: '12px 32px',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: '0.2s'
          }}
        >
          {calculations.isFree ? 'ثبت سفارش' : 'پرداخت'}
        </button>
      </div>

      {/* Popups */}
      {showSummaryPopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 11
          }}
          onClick={() => setShowSummaryPopup(false)}
        >
          <div 
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '420px',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px 48px',
              position: 'relative',
              minHeight: '200px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowSummaryPopup(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                position: 'absolute',
                top: '10px',
                left: '16px',
                cursor: 'pointer'
              }}
            >×</button>
            
            <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 500, color: '#666' }}>خلاصه سفارش</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', fontSize: '0.85rem' }}>
              {actualMode === 'group' && (
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>قیمت اصلی کالاها</span>
                  <span>{formatPrice(calculations.originalPrice)}</span>
                </li>
              )}
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>{actualMode === 'solo' ? 'قیمت کالاها' : 'قیمت کالاها با خرید گروهی'}</span>
                <span>{formatPrice(calculations.currentPrice)}</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>هزینه ارسال</span>
                <span>رایگان</span>
              </li>
              {calculations.consolidationDiscount > 0 && (
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>تخفیف تجمیع سفارش</span>
                  <span style={{ color: '#e53935' }}>−{formatPrice(calculations.consolidationDiscount)}</span>
                </li>
              )}
              {calculations.walletUse > 0 && (
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>کسر از کیف پول</span>
                  <span>−{formatPrice(calculations.walletUse)}</span>
                </li>
              )}
              {calculations.savings > 0 && (
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>سود شما از این خرید</span>
                  <span style={{ color: '#00c853' }}>{formatPrice(calculations.savings)}</span>
                </li>
              )}
            </ul>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem' }}>
              <span>جمع کل</span>
              <strong>{calculations.isFree ? 'رایگان' : formatPrice(calculations.total)}</strong>
            </div>
          </div>
        </div>
      )}

      {showHeaderPopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 11
          }}
          onClick={() => setShowHeaderPopup(false)}
        >
          <div 
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '420px',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px 48px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowHeaderPopup(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                position: 'absolute',
                top: '10px',
                left: '16px',
                cursor: 'pointer'
              }}
            >×</button>
            <p style={{ lineHeight: '1.8' }}>
              ارسال رایگان برای سفارش‌های بالای ۳۰۰٬۰۰۰ تومان به‌صورت خودکار اعمال می‌شود.<br />
              همچنین با لینک دعوت دوستان می‌توانید تا ۴۰٪ تخفیف دریافت کنید.<br />
              هر روز پیشنهاد شگفت‌انگیز داریم، حتما صفحه اول را ببینید!
            </p>
          </div>
        </div>
      )}

      {showShipPopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 11
          }}
          onClick={() => setShowShipPopup(false)}
        >
          <div 
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '420px',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px 48px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowShipPopup(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                position: 'absolute',
                top: '10px',
                left: '16px',
                cursor: 'pointer'
              }}
            >×</button>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#444' }}>انتخاب بازه زمانی</h3>
            
            <div style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              marginBottom: '16px'
            }}>
              {(useAdminTomorrowSlots ? [{ id: 0, label: tomorrowLabelPrefix, dayNum: '' as any }] : days).map((day) => (
                <div
                  key={day.id}
                  style={{
                    minWidth: '68px',
                    textAlign: 'center',
                    border: `1px solid ${chosenDay === day.id ? '#E31C5F' : '#e0e0e0'}`,
                    borderRadius: '12px',
                    padding: '10px 3px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    flexShrink: 0,
                    userSelect: 'none',
                    color: chosenDay === day.id ? '#E31C5F' : 'inherit',
                    fontWeight: chosenDay === day.id ? 700 : 'normal'
                  }}
                  onClick={() => setChosenDay(day.id)}
                >
                  <div style={{ fontWeight: 700 }}>{day.label}</div>
                  {useAdminTomorrowSlots && tomorrowIso && (
                    <div style={{ fontSize: '0.7rem', margin: '.2rem 0', color: '#666', lineHeight: '1.2' }}>
                      {formatPersianDate(tomorrowIso)}
                    </div>
                  )}
                  {!useAdminTomorrowSlots && <div style={{ fontSize: '1.2rem', margin: '.3rem 0' }}>{toFa(day.dayNum)}</div>}
                  <small style={{ color: '#00c853' }}>رایگان</small>
                </div>
              ))}
            </div>
            
            <div style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              marginBottom: '16px'
            }}>
              {availableSlotLabels.length === 0 && useAdminTomorrowSlots ? (
                <div style={{
                  width: '100%',
                  textAlign: 'center',
                  padding: '20px',
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  هیچ بازه زمانی فعالی برای فردا تعریف نشده است
                </div>
              ) : (
                availableSlotLabels.map((slot, index) => (
                <div
                  key={index}
                  style={{
                    minWidth: '68px',
                    textAlign: 'center',
                    border: `1px solid ${tempChosenSlot === index ? '#E31C5F' : '#e0e0e0'}`,
                    borderRadius: '12px',
                    padding: '10px 3px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    flexShrink: 0,
                    userSelect: 'none',
                    color: tempChosenSlot === index ? '#E31C5F' : 'inherit',
                    fontWeight: tempChosenSlot === index ? 700 : 'normal'
                  }}
                  onClick={() => setTempChosenSlot(index)}
                >
                  {slot}
                </div>
              ))
              )}
            </div>
            
            <button
              type="button"
              onClick={() => {
                // Get current values at click time
                const currentTempSlot = tempChosenSlot;
                const currentLabels = useAdminTomorrowSlots && tomorrowSlotLabels.length > 0 ? tomorrowSlotLabels : availableSlotLabels;
                const currentPrefix = tomorrowLabelPrefix;

                if (!currentLabels || currentLabels.length === 0) {
                  setShowShipPopup(false);
                  return;
                }

                const safeIndex = Math.min(Math.max(0, currentTempSlot), currentLabels.length - 1);
                const selectedLabel = currentLabels[safeIndex];

                // Close popup first
                setShowShipPopup(false);

                // Then update slot with a small delay to ensure state updates
                setTimeout(() => {
                  if (useAdminTomorrowSlots && tomorrowSlotLabels.length > 0) {
                    const newSlot = `${currentPrefix} ${selectedLabel}`;
                    setSelectedSlot(newSlot);
                  } else {
                    const safeDay = days.find(d => d.id === chosenDay) || days[0];
                    const newSlot = `${safeDay.label}، ${selectedLabel}`;
                    setSelectedSlot(newSlot);
                  }
                  setChosenSlot(currentTempSlot);
                }, 100);
              }}
              style={{
                width: '100%',
                background: '#ff006a',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                padding: '11px',
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >تأیید</button>
          </div>
        </div>
      )}

      {showLeaderShipInfoPopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 11
          }}
          onClick={() => setShowLeaderShipInfoPopup(false)}
        >
          <div 
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '420px',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px 48px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowLeaderShipInfoPopup(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                position: 'absolute',
                top: '10px',
                left: '16px',
                cursor: 'pointer'
              }}
            >×</button>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#444' }}>زمان ارسال بعد از تشکیل گروه</h3>
            <p style={{ marginTop: '12px', lineHeight: '1.8', fontSize: '0.9rem', color: '#444' }}>
              شما به عنوان سرگروه پس از کامل شدن اعضای گروه می‌توانید بازه زمانی ارسال سفارش را انتخاب کنید.
              تا قبل از تشکیل گروه، امکان تعیین دقیق زمان ارسال وجود ندارد و پس از نهایی شدن گروه از طریق صفحهٔ رهگیری یا جزئیات سفارش قابل تنظیم است.
            </p>
          </div>
        </div>
      )}

      {showInvitedShipInfoPopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 11
          }}
          onClick={() => setShowInvitedShipInfoPopup(false)}
        >
          <div 
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '420px',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px 48px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowInvitedShipInfoPopup(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                position: 'absolute',
                top: '10px',
                left: '16px',
                cursor: 'pointer'
              }}
            >×</button>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#444' }}>توضیحات زمان ارسال توسط سرگروه</h3>
            <p style={{ marginTop: '12px', lineHeight: '1.8', fontSize: '0.9rem', color: '#444' }}>
              چون سفارش شما به آدرس سرگروه ارسال می‌شود، انتخاب زمان ارسال توسط سرگروه انجام خواهد شد.
              پس از هماهنگی اعضای گروه، سرگروه بازهٔ زمانی مناسب را انتخاب می‌کند و سفارش‌ها در همان بازه ارسال می‌شوند.
            </p>
          </div>
        </div>
      )}

      {showBasketPopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 11
          }}
          onClick={() => setShowBasketPopup(false)}
        >
          <div 
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '420px',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px 48px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowBasketPopup(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.4rem',
                position: 'absolute',
                top: '10px',
                left: '16px',
                cursor: 'pointer'
              }}
            >×</button>
            
            <div style={{
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '0 16px 16px'
            }}>
              {items.map((item) => (
                <article 
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '16px',
                    marginTop: '16px'
                  }}
                >
                  <img
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      objectFit: 'cover'
                    }}
                    src={item.image && item.image.trim() !== '' ? item.image : `https://picsum.photos/seed/${item.id}/56/56`}
                    alt={item.name}
                    onError={(e) => {
                      const fallback = `https://picsum.photos/seed/${item.id}/56/56`;
                      if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}>{item.name}</h3>
                    <span style={{
                      fontSize: '0.78rem',
                      color: '#666'
                    }}>{`وزن محصول`}</span>
                    <div style={{
                      marginTop: '4px',
                      fontSize: '0.8rem'
                    }}>
                      تعداد: <span style={{ fontWeight: 700 }}>{toFa(item.quantity)}</span>
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'left',
                    minWidth: '86px'
                  }}>
                    {actualMode === 'group' && (
                      <span style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        color: '#aaa',
                        textDecoration: 'line-through'
                      }}>
                        {isJoiningGroup 
                          ? formatPrice((item.market_price || item.base_price) * item.quantity)
                          : formatPrice(item.base_price * item.quantity)
                        }
                      </span>
                    )}
                    <span style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#ff006a'
                    }}>
                      {actualMode === 'solo' 
                        ? formatPrice(item.base_price * item.quantity)
                        : (() => {
                            // For invited users joining a group, use base_price (friend_1_price)
                            if (isJoiningGroup) {
                              return formatPrice(item.base_price * item.quantity);
                            }
                            
                            // Regular group logic for other users
                            const friends = friendsParam ? parseInt(friendsParam) : 1;
                            const maxFriends = maxFriendsParam ? parseInt(maxFriendsParam) : 3;
                            const friendPrice = item.friend_1_price ?? Math.round(item.base_price * 0.5);
                            
                            let itemPrice: number;
                            // For group purchase, maximum price should not exceed friendPrice
                            if (friends === 0) itemPrice = friendPrice; // Use friendPrice instead of base_price
                            else if (friends === 1) itemPrice = friendPrice;
                            else if (friends === maxFriends) itemPrice = 0; // Free when reaching max friends
                            else {
                              // Calculate price based on friends count
                              const calculatedPrice = Math.round(item.base_price / (friends + 1));
                              // If calculated price is 0 or negative, make it free
                              itemPrice = calculatedPrice <= 0 ? 0 : calculatedPrice;
                            }
                            
                            return formatPrice(itemPrice * item.quantity);
                          })()
                      }
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      <AddressPopup
        open={showAddressPopup}
        addresses={authAddresses || []}
        onClose={()=>setShowAddressPopup(false)}
        onEdit={handleEditAddr}
        onAdd={handleAddAddress}
        onDelete={handleDeleteAddr}
        onSetMain={handleSetMain}
      />

      {/* Address Map Modal */}
      <AddressMapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        onAddressSave={handleAddressSave}
        userToken={token || undefined}
        userId={user?.id}
        initialAddress={modalInit?.fullAddress || currentDefaultAddress?.full_address || savedAddress?.fullAddress}
        initialDetails={modalInit?.details || currentDefaultAddress?.receiver_name || savedAddress?.details}
        initialPhone={modalInit?.phone || currentDefaultAddress?.phone_number || savedAddress?.phone}
        initialCoordinates={modalInit?.coordinates || ((currentDefaultAddress && typeof currentDefaultAddress.latitude === 'number' && typeof currentDefaultAddress.longitude === 'number')
          ? { lat: currentDefaultAddress.latitude, lng: currentDefaultAddress.longitude }
          : savedAddress?.coordinates)}
      />

    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-4 animate-pulse"></div>
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}
