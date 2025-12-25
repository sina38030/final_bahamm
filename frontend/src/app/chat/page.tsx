'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneAuthModal from '@/components/auth/PhoneAuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/utils/apiClient';
import { toTehranTime } from '@/utils/dateUtils';
import { PageErrorBoundary } from '@/components/common/PageErrorBoundary';
import { safeStorage } from '@/utils/safeStorage';
import { IoArrowBack, IoSend, IoCheckmark, IoCheckmarkDone } from "react-icons/io5";
import { FaHeadset } from "react-icons/fa";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
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

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f0f2f5] pb-16">
      {!isAuthenticated ? (
        <div className="flex flex-col h-full" dir="rtl">
          <div className="sticky top-0 bg-white z-10 shadow-sm">
            <div className="px-4 py-3">
              <div className="relative flex items-center justify-between">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="بازگشت">
                  <IoArrowBack size={24} className="text-gray-600 transform rotate-180" />
                </button>
                <div className="flex items-center gap-2">
                   <h1 className="text-lg font-bold text-gray-800">پشتیبانی</h1>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 flex flex-col items-center justify-center flex-1 text-center bg-white">
            {/* Chat Icon with Animation */}
            <div className="mb-8 relative animate-fade-in-up">
              <div className="w-40 h-40 bg-[#fff0f5] rounded-full flex items-center justify-center shadow-sm relative z-10">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-inner">
                  <FaHeadset className="w-16 h-16 text-[#E31C5F]" />
                </div>
              </div>
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-8 h-8 bg-[#E31C5F] rounded-full opacity-20 animate-pulse delay-75"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 bg-[#E31C5F] rounded-full opacity-30 animate-pulse delay-150"></div>
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
                className="w-full bg-[#E31C5F] hover:bg-[#c41650] active:bg-[#a61243] text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-pink-200 transform transition-all duration-200 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group"
              >
                <span>ورود به حساب کاربری</span>
                <span className="group-hover:translate-x-[-4px] transition-transform duration-200">←</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="sticky top-0 bg-white z-20 px-4 py-3 shadow-sm border-b border-gray-100">
            <div className="relative flex items-center h-10" dir="rtl">
              {/* Right: Back Button */}
              <button 
                onClick={() => router.back()} 
                className="absolute right-0 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors" 
                aria-label="بازگشت"
              >
                <IoArrowBack size={24} className="text-gray-600 transform rotate-180" />
              </button>

              {/* Center: Title & Icon */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <h1 className="text-base font-bold text-gray-800">پشتیبانی آنلاین</h1>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 bg-[#fff0f5] rounded-full flex items-center justify-center border border-pink-100">
                       <FaHeadset className="text-[#E31C5F] text-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f0f2f5] no-scrollbar" 
            dir="ltr"
            style={{ 
              backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E31C5F]"></div>
              </div>
            ) : messages.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full opacity-60">
                 <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <FaHeadset className="text-gray-400 text-2xl" />
                 </div>
                 <p className="text-gray-500 text-sm">پیامی وجود ندارد. گفتگو را آغاز کنید.</p>
               </div>
            ) : (
              messages.map((m) => {
                const mine = m.sender === 'user';
                return (
                  <div key={m.id} className={`flex w-full ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`
                        relative max-w-[75%] px-4 py-3 shadow-sm text-sm leading-6
                        ${mine 
                          ? 'bg-[#E31C5F] text-white rounded-2xl rounded-tr-sm' 
                          : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'
                        }
                      `}
                    >
                      <div dir="rtl" className="whitespace-pre-wrap break-words text-right">{m.message}</div>
                      <div className={`flex items-center gap-1 mt-1 text-[10px] ${mine ? 'text-pink-100 justify-end' : 'text-gray-400 justify-start'}`}>
                        <span>{toTehranTime(m.timestamp)}</span>
                        {mine && (
                          <span className="text-base">
                            {m.seen ? <IoCheckmarkDone /> : m.delivered ? <IoCheckmark /> : <IoCheckmark className="opacity-50"/>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white p-3 border-t border-gray-100" dir="rtl">
            <div className="flex items-end gap-2 max-w-4xl mx-auto" dir="ltr">
              <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-2 focus-within:ring-2 focus-within:ring-pink-100 focus-within:bg-white transition-all border border-transparent focus-within:border-pink-200">
                <textarea
                  ref={textareaRef}
                  dir="rtl"
                  className="w-full bg-transparent border-none outline-none text-sm text-gray-800 resize-none max-h-32 min-h-[24px] py-1 text-right"
                  rows={1}
                  placeholder="پیام خود را بنویسید..."
                  value={input}
                  onChange={adjustTextareaHeight}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  style={{ height: 'auto' }}
                />
              </div>
              <button
                disabled={sending || !input.trim()}
                className={`
                  w-10 h-10 rounded-full inline-flex items-center justify-center transition-all duration-200 flex-shrink-0
                  ${sending || !input.trim() 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-[#E31C5F] text-white hover:bg-[#c41650] active:scale-95 shadow-md shadow-pink-200'
                  }
                `}
                onClick={handleSend}
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IoSend className="text-[18px]" />
                )}
              </button>
            </div>
            {/* Safe area padding for mobile */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </>
      )}

      
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
