// layout.tsx
import './globals.css';
import './global2.css';
import './home-legacy.css';

import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import { CartProvider } from '@/contexts/CartContext';
import Providers from './providers';

import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
config.autoAddCss = false;

const vazir = Vazirmatn({
  subsets: ['arabic', 'latin-ext'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'فروشگاه میوه',
  viewport: 'width=device-width,initial-scale=1',
  direction: 'rtl',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.className}>
      <body style={{ background: '#fff' }}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}