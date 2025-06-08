'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import styles from '../styles.module.css';
import sheetContent from './content';

type SheetKey = keyof typeof sheetContent;
type Ctx = { open: (k: SheetKey) => void; close: () => void };
const SheetCtx = createContext<Ctx>(null!);

export function BottomSheetProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey]   = useState<SheetKey | null>(null);
  const [show, setShow] = useState(false);

  const close = () => { setShow(false); setTimeout(() => setKey(null), 350); };
  const open  = (k: SheetKey) => { setKey(k); setShow(true); };

  /* ESC برای بستن */
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  return (
    <SheetCtx.Provider value={{ open, close }}>
      {children}

      {/* لایهٔ دودی */}
      {key && (
        <div
          className={`${styles.sheetBackdrop} ${show ? 'show' : ''}`}
          onClick={close}
        />
      )}

      {key && (
        <div className={`${styles.sheet} ${show ? styles.sheetShow : ''}`}>
          <button className={styles.sheetClose} onClick={close}>&times;</button>
          {sheetContent[key]}
        </div>
      )}
    </SheetCtx.Provider>
  );
}
export const useSheet = () => useContext(SheetCtx);
