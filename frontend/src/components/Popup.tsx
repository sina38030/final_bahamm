'use client';
import { ReactNode } from 'react';

export default function Popup({
  show,
  onClose,
  children,
}: { show: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className={`popup ${show ? 'show' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="popup-box">
        <span className="popup-close" onClick={onClose}>&times;</span>
        {children}
      </div>
    </div>
  );
}
