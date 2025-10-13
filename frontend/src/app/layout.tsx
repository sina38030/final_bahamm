// layout.tsx
import './global2.css';
import './globals.css';
import './home-legacy.css';
import './landingM.css';

import type { Metadata } from 'next';
import { CartProvider } from '@/contexts/CartContext';
import { Providers } from '@/providers/Providers';
import { iransans } from '@/lib/fonts';
import PageWrapper from '@/components/layout/PageWrapper';

import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
config.autoAddCss = false;

export const metadata: Metadata = {
  title: 'فروشگاه باهم',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={iransans.variable}>
      <head>
        {/* Preconnect links removed to avoid localhost references in production */}
        {/* Telegram Mini App Script */}
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body style={{ background: '#fff' }}>
        <Providers>
          <CartProvider>
            <PageWrapper>
              {children}
            </PageWrapper>
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}