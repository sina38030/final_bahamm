'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import styles from './styles.module.css';

type Ctx = {
  open: (arr: string[], start: number) => void;
  close: () => void;
};

const LightCtx = createContext<Ctx>(null!);

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [imgs, setImgs]   = useState<string[]>([]);
  const [idx, setIdx]     = useState(0);
  const [open, setOpen]   = useState(false);
  const scrollY           = useRef(0);

  /* ---------- قفل اسکرول با پرتال ---------- */
  useEffect(() => {
    if (open) {
      scrollY.current = window.scrollY;
      document.body.style.cssText = `
        position:fixed; top:-${scrollY.current}px; left:0; right:0;
        overflow:hidden; width:100%;
      `;
    } else {
      document.body.style.cssText = '';
      window.scrollTo(0, scrollY.current);
    }
  }, [open]);

  /* ---------- handlers ---------- */
  const show  = (arr: string[], start: number) => {
    setImgs(arr);
    setIdx(start);
    setOpen(true);
  };
  const close = () => setOpen(false);

  const nav = (d: 1 | -1) =>
    setIdx(i => (i + d + imgs.length) % imgs.length);

  const overlay = open ? (
    <div className={styles.lbOverlay} onClick={close}>
      <button
        className={`${styles.navBtn} ${styles.right}`}
        onClick={e => {
          e.stopPropagation();
          nav(-1);
        }}
      >
        <FontAwesomeIcon icon={faAngleRight} />
      </button>

      <img
        src={imgs[idx]}
        alt=""
        className={styles.lbImg}
        onClick={e => e.stopPropagation()}
        draggable={false}
      />

      <button
        className={`${styles.navBtn} ${styles.left}`}
        onClick={e => {
          e.stopPropagation();
          nav(1);
        }}
      >
        <FontAwesomeIcon icon={faAngleLeft} />
      </button>

      <button
        className={styles.closeBtn}
        onClick={e => {
          e.stopPropagation();
          close();
        }}
      >
        &times;
      </button>
    </div>
  ) : null;

  /* ---------- خروجی ---------- */
  return (
    <LightCtx.Provider value={{ open: show, close }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(overlay, document.body)}
    </LightCtx.Provider>
  );
}

export const useLightbox = () => useContext(LightCtx);
