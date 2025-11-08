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
import ChunkErrorReload from '@/components/ChunkErrorReload';

import FontAwesomeSetup from '@/components/FontAwesomeSetup';
import { ProductModalProvider } from '@/hooks/useProductModal';
import ProductModal from '@/components/ProductModal';

export const metadata: Metadata = {
  title: 'فروشگاه باهم',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={iransans.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect links removed to avoid localhost references in production */}
        {/* Telegram Mini App Script */}
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
        {/* Early chunk-error recovery: catch failed Next.js chunk loads and reload once */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try {
  var KEY = 'once-reload-on-chunk-error';
  var reloaded = false;
  try { reloaded = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
  function mark() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }
  function reloadOnce() { if (reloaded) return; reloaded = true; mark(); try { window.location.reload(); } catch (_) { window.location.href = window.location.href; } }
  function looksLikeChunkErrorMessage(msg) {
    return !!msg && (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Loading chunk') !== -1 || msg.indexOf('/_next/static/chunks/') !== -1);
  }
  window.addEventListener('error', function (e) {
    try {
      var t = e && e.target; var src = t && t.src || '';
      if (src && src.indexOf('/_next/static/chunks/') !== -1) { reloadOnce(); return; }
      var msg = (e && e.message) || '';
      if (looksLikeChunkErrorMessage(msg)) { reloadOnce(); }
    } catch (e2) {}
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    try {
      var r = e && e.reason; var s = '' + (r && (r.message || r) || '');
      if (looksLikeChunkErrorMessage(s)) { reloadOnce(); }
    } catch (e3) {}
  });
} catch (e0) {} })();`,
          }}
        />
      </head>
      <body style={{ background: '#fff' }}>
        <Providers>
          <CartProvider>
            <PageWrapper>
              <FontAwesomeSetup />
              <ChunkErrorReload />
              <ProductModalProvider>
                {children}
                <ProductModal />
              </ProductModalProvider>
            </PageWrapper>
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}