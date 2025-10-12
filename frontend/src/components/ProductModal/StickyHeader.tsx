'use client';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareNodes } from '@fortawesome/free-solid-svg-icons';
import { useSheet } from './sheets/BottomSheet';
import styles from './styles.module.css';

const msgs=['مستقیم از مزرعه','تحویل زیر ۲۴ ساعت','قیمت باهم کمتره'];

export default function StickyHeader({close}:{close:()=>void}){
  const { open } = useSheet();
  const [show,setShow] = useState(false);
  const [idx,setIdx]   = useState(0);

  useEffect(()=>{
    const modal=document.querySelector(`.${styles.modal}`);
    if (!modal) return;
    
    let ticking = false;
    const onScr=()=>{
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setShow(modal.scrollTop>80);
          ticking = false;
        });
        ticking = true;
      }
    };
    modal.addEventListener('scroll',onScr, { passive: true });
    return()=>modal.removeEventListener('scroll',onScr);
  },[]);

  useEffect(()=>{
    const id=setInterval(()=>setIdx(i=>(i+1)%msgs.length),5000); // Increased interval to 5 seconds
    return()=>clearInterval(id);
  },[]);

  return(
    <header className={`${styles.stickyBar} ${show?styles.barShow:''}`}>
      <button className={styles.smallBtn} onClick={close}>&times;</button>
      <span className={styles.msg}>{msgs[idx]}</span>
    </header>
  );
}
