'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneAuthModal from '@/components/auth/PhoneAuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/utils/apiClient';
import { toTehranTime } from '@/utils/dateUtils';
import { PageErrorBoundary } from '@/components/common/PageErrorBoundary';
import { safeStorage } from '@/utils/safeStorage';

type ChatMessage = {
  id: number;
  sender: 'user' | 'admin';
  message: string;
  timestamp: string;
  delivered?: boolean;
  seen?: boolean;
};

function ChatPageContent() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const res = await apiClient.get('/chat/admin/messages');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setMessages(data || []);
          // Mark admin messages as seen (those not sent by user)
          const unseen = (data || []).filter((m: ChatMessage) => m.sender === 'admin' && !m.seen).map((m: ChatMessage) => m.id);
          if (unseen.length) {
            try { await apiClient.post('/chat/admin/messages/seen', unseen); } catch {}
          }
          // Persist last-seen admin message id so bottom nav badge only shows truly new ones
          const latestAdminId = (data || [])
            .filter((m: ChatMessage) => m.sender === 'admin')
            .reduce((max: number, m: ChatMessage) => (m.id > max ? m.id : max), 0);
          safeStorage.setItem('chat_last_seen_admin_id', String(latestAdminId || 0));
        }
      } catch (e) {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 2000);
    return () => {
      isMounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await apiClient.post('/chat/admin/send', { message: text });
      if (res.ok) {
        setInput('');
        const updated = await apiClient.get('/chat/admin/messages');
        if (updated.ok) {
          const data = await updated.json();
          setMessages(data || []);
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[100vh] bg-gray-50">
      {!isAuthenticated ? (
        <div className="flex flex-col h-full" dir="rtl">
          <div className="sticky top-0 bg-white z-10">
            <div className="px-4 py-3 border-b">
              <div className="relative flex items-center justify-between">
                <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold">گفتگو با پشتیبانی</h1>
                <button onClick={() => router.back()} className="ml-auto p-2 hover:bg-gray-100 rounded-full" aria-label="بازگشت">
                  <span className="inline-block">❮</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6 flex flex-col items-center justify-center flex-1 text-center">
            {/* Chat Icon with Animation */}
            <div className="mb-8 relative animate-fade-in-up">
              <div className="w-40 h-40 bg-blue-50 rounded-full flex items-center justify-center shadow-sm relative z-10">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-inner">
                  <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
              </div>
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-8 h-8 bg-blue-200 rounded-full opacity-50 animate-pulse delay-75"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 bg-blue-300 rounded-full opacity-50 animate-pulse delay-150"></div>
            </div>

            {/* Text Content */}
            <div className="space-y-3 mb-10 max-w-xs mx-auto animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <h2 className="text-2xl font-bold text-gray-800">
                گفتگو با پشتیبانی
              </h2>
              <p className="text-base text-gray-500 leading-relaxed">
                برای شروع گفتگو با تیم پشتیبانی، لطفاً وارد حساب کاربری شوید.
              </p>
            </div>

            {/* Login Button */}
            <div className="w-full max-w-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <button
                onClick={() => setShowPhoneAuth(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-200 transform transition-all duration-200 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group"
              >
                <span>ورود به حساب کاربری</span>
                <span className="group-hover:translate-x-[-4px] transition-transform duration-200">←</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="sticky top-0 bg-white z-10 -mx-0 px-4 py-3 border-b">
            <div className="relative flex items-center justify-between">
              <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold">گفتگو با پشتیبانی</h1>
              <button onClick={() => router.back()} className="ml-auto p-2 hover:bg-gray-100 rounded-full" aria-label="بازگشت">
                {/* Left-pointing back arrow */}
                <span className="inline-block">❮</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {loading ? (
              <div className="text-center text-sm text-gray-500 mt-4">در حال بارگذاری...</div>
            ) : (
              messages.map((m) => {
                const mine = m.sender === 'user';
                const checks = mine ? (m.seen ? '✔✔' : m.delivered ? '✔' : '') : '';
                return (
                  <div key={m.id} className="flex">
                    <div className={`${mine ? 'ml-auto bg-red-600 text-white' : 'mr-auto bg-white text-gray-800'} px-3 py-2 rounded-xl max-w-[75%] shadow`}>
                      <div className="whitespace-pre-wrap break-words text-sm">{m.message}</div>
                      <div className={`text-[10px] mt-1 opacity-70 ${mine ? 'text-right' : 'text-left'}`}>
                        <span>{toTehranTime(m.timestamp)}</span>
                        {mine ? <span className="ml-2">{checks}</span> : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <div className="fixed bottom-16 left-0 right-0 z-50 p-2 pb-[env(safe-area-inset-bottom)] border-t bg-white flex items-end gap-2">
            <textarea
              className="flex-1 border rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-red-500 max-h-40 min-h-[42px]"
              rows={1}
              placeholder="پیام خود را بنویسید..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              disabled={sending || !input.trim()}
              className={`px-4 py-2 rounded-md text-white ${sending || !input.trim() ? 'bg-gray-300' : 'bg-red-600'}`}
              onClick={handleSend}
            >
              ارسال
            </button>
          </div>
        </>
      )}

      

      {/* Bottom-sheet phone authentication, same as cart */}
      <PhoneAuthModal
        isOpen={showPhoneAuth}
        onClose={() => setShowPhoneAuth(false)}
        onSuccess={() => {
          setShowPhoneAuth(false);
          // After successful login, reload page state to show chat
          router.refresh();
        }}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <PageErrorBoundary fallbackTitle="خطا در بارگذاری چت">
      <ChatPageContent />
    </PageErrorBoundary>
  );
}
