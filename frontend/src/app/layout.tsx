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

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={iransans.variable} suppressHydrationWarning>
      <head>
        {/* CRITICAL: Polyfills for Android WebView - MUST run BEFORE any other JS */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  // StorageEvent polyfill for Android WebView < Chrome 70
  // This MUST run before React loads to prevent crashes
  if(typeof window!=='undefined'){
    // Test if StorageEvent constructor works with options
    try{
      new StorageEvent('test',{key:'k'});
    }catch(e){
      // Polyfill StorageEvent for older Android WebViews
      window.StorageEvent=function(type,init){
        init=init||{};
        var evt;
        try{
          evt=document.createEvent('StorageEvent');
          evt.initStorageEvent(type,init.bubbles||false,init.cancelable||false,
            init.key||null,init.oldValue||null,init.newValue||null,
            init.url||location.href,init.storageArea||localStorage);
        }catch(e2){
          evt=document.createEvent('CustomEvent');
          evt.initCustomEvent(type,init.bubbles||false,init.cancelable||false,init);
          evt.key=init.key||null;
          evt.oldValue=init.oldValue||null;
          evt.newValue=init.newValue||null;
        }
        return evt;
      };
    }
    // Array.at polyfill for Android Chrome < 92
    if(!Array.prototype.at){
      Array.prototype.at=function(i){return i>=0?this[i]:this[this.length+i]};
    }
    // String.at polyfill
    if(!String.prototype.at){
      String.prototype.at=function(i){return i>=0?this.charAt(i):this.charAt(this.length+i)};
    }
    // Object.fromEntries polyfill for Android Chrome < 73
    if(!Object.fromEntries){
      Object.fromEntries=function(arr){var o={};arr.forEach(function(p){o[p[0]]=p[1]});return o};
    }
    // replaceAll polyfill for Android Chrome < 85
    if(!String.prototype.replaceAll){
      String.prototype.replaceAll=function(s,r){return this.split(s).join(r)};
    }
  }
}catch(e){}})();`,
          }}
        />
        {/* Telegram Mini App Script - MUST be synchronous for Android compatibility */}
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        {/* Early error recovery: catch ALL errors and chunk loading failures */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  var KEY='once-reload-on-chunk-error';
  var COUNT_KEY='chunk-error-reload-count';
  var reloaded=false;
  try{reloaded=sessionStorage.getItem(KEY)==='1';}catch(e){}
  function mark(){try{sessionStorage.setItem(KEY,'1');}catch(e){}}
  function bumpCount(){
    try{
      var c=parseInt(sessionStorage.getItem(COUNT_KEY)||'0',10);
      if(isNaN(c)) c=0;
      if(c>=2) return false;
      sessionStorage.setItem(COUNT_KEY,String(c+1));
      return true;
    }catch(e){ return true; }
  }
  function cacheBustUrl(){
    try{
      var u=new URL(location.href);
      u.searchParams.set('__r',String(Date.now()));
      return u.toString();
    }catch(e){
      var sep=location.href.indexOf('?')!==-1?'&':'?';
      return location.href+sep+'__r='+Date.now();
    }
  }
  function reloadOnce(){
    if(reloaded) return;
    reloaded=true;
    mark();
    if(!bumpCount()) return;
    var nextHref=cacheBustUrl();
    try{location.replace(nextHref);}catch(_){try{location.href=nextHref;}catch(__){location.href=location.href;}}
  }
  function isRecoverableError(msg){
    if(!msg)return false;
    msg=String(msg);
    return msg.indexOf('ChunkLoadError')!==-1||
           msg.indexOf('Loading chunk')!==-1||
           msg.indexOf('/_next/static/chunks/')!==-1||
           msg.indexOf('StorageEvent')!==-1||
           msg.indexOf('is not a constructor')!==-1||
           msg.indexOf('Cannot read prop')!==-1;
  }
  window.addEventListener('error',function(e){
    try{
      var t=e&&e.target;var src=t&&t.src||'';
      if(src&&src.indexOf('/_next/static/chunks/')!==-1){reloadOnce();return;}
      var msg=(e&&e.message)||'';
      if(isRecoverableError(msg))reloadOnce();
    }catch(e2){}
  },true);
  window.addEventListener('unhandledrejection',function(e){
    try{
      var r=e&&e.reason;var s=''+(r&&(r.message||r)||'');
      if(isRecoverableError(s))reloadOnce();
    }catch(e3){}
  });
}catch(e0){}})();`,
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