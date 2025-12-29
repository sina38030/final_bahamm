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
        {/* Telegram SDK - Conditionally loaded only in Telegram environment */}
        {/* This prevents connection delays for non-Telegram users in regions where telegram.org is blocked */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  // Detect if we're in a Telegram environment before loading the SDK
  function isTelegram(){
    if(typeof window==='undefined')return false;
    // Check URL hash for tgWebAppData
    if(location.hash.indexOf('tgWebAppData')!==-1)return true;
    // Check for startapp parameter (Telegram Mini App deep link)
    if(location.search.indexOf('startapp=')!==-1)return true;
    // Check user agent
    var ua=navigator.userAgent.toLowerCase();
    if(ua.indexOf('telegram')!==-1||ua.indexOf('tgweb')!==-1)return true;
    // Check referrer
    var ref=document.referrer.toLowerCase();
    if(ref.indexOf('telegram.org')!==-1||ref.indexOf('t.me')!==-1||ref.indexOf('web.telegram.org')!==-1)return true;
    // Check if Telegram object already exists
    if(window.Telegram&&window.Telegram.WebApp)return true;
    // Check if in iframe (Telegram Mini Apps run in iframes)
    try{if(window.self!==window.top)return true;}catch(e){return true;}
    return false;
  }
  if(isTelegram()){
    console.log('[TelegramLoader] Telegram environment detected, loading SDK');
    var s=document.createElement('script');
    s.src='https://telegram.org/js/telegram-web-app.js';
    s.async=false;
    s.onload=function(){console.log('[TelegramLoader] SDK loaded');window.dispatchEvent(new CustomEvent('telegram-sdk-loaded'));};
    s.onerror=function(){console.warn('[TelegramLoader] SDK failed to load');};
    document.head.appendChild(s);
  }else{
    console.log('[TelegramLoader] Not in Telegram environment, skipping SDK');
  }
}catch(e){console.error('[TelegramLoader] Error:',e);}})();`,
          }}
        />
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