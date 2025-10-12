 'use client';
 import { useEffect, useState } from 'react';
 import { usePathname } from 'next/navigation';
 import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
 import { faHouse, faComments, faUser, faUsers } from '@fortawesome/free-solid-svg-icons';
 import Link from 'next/link';
 import { useCart } from '@/contexts/CartContext';
 
 export default function BottomNav() {
   const pathname = usePathname();
   const { totalItems } = useCart();
   const [hidden, setHidden] = useState(false);
 
   useEffect(() => {
     // Only apply scroll hide/show on home page when cart bar is visible
     if (pathname !== '/' || totalItems === 0) {
       setHidden(false);
       return;
     }
 
     let lastY = window.scrollY;
     const onScroll = () => {
       const y = window.scrollY;
       const delta = y - lastY;
       // Thresholds to avoid jitter
       if (Math.abs(delta) < 10) return;
       if (y > 50 && delta > 0) {
         // scrolling down
         setHidden(true);
       } else if (delta < 0) {
         // scrolling up
         setHidden(false);
       }
       lastY = y;
     };
 
     window.addEventListener('scroll', onScroll, { passive: true });
     return () => window.removeEventListener('scroll', onScroll);
   }, [pathname, totalItems]);
 
   return (
     <nav className={`bottom-nav${hidden ? ' hide' : ''}`}>
       <Link href="/" className={`tab ${pathname === '/' ? 'active' : ''}`}>
         <FontAwesomeIcon icon={faHouse} className="nav-ico" />
         <span>خانه</span>
       </Link>
       <Link href="/groups-orders" className={`tab ${pathname?.startsWith('/groups-orders') ? 'active' : ''}`}>
         <FontAwesomeIcon icon={faUsers} className="nav-ico" />
         <span>گروه و سفارش‌ها</span>
       </Link>
       <Link href="/chat" className={`tab ${pathname === '/chat' ? 'active' : ''}`}>
         <FontAwesomeIcon icon={faComments} className="nav-ico" />
         <span>گفتگو</span>
       </Link>
       <Link href="/profile" className={`tab ${pathname?.startsWith('/profile') ? 'active' : ''}`}>
         <FontAwesomeIcon icon={faUser} className="nav-ico" />
         <span>حساب</span>
       </Link>
     </nav>
   );
 }
