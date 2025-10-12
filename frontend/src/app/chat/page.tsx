'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhoneAuthModal from '@/components/auth/PhoneAuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/utils/apiClient';
import { toTehranTime } from '@/utils/dateUtils';

type ChatMessage = {
  id: number;
  sender: 'user' | 'admin';
  message: string;
  timestamp: string;
  delivered?: boolean;
  seen?: boolean;
};

export default function ChatPage() {
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
          if (typeof window !== 'undefined') {
            localStorage.setItem('chat_last_seen_admin_id', String(latestAdminId || 0));
          }
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
      endRef.current.scrollIntoView({ behavior: 'smooth' });
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
    <div className="flex flex-col h-[100vh] bg-white pb-28">
      {!isAuthenticated ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-4">
          <h1 className="text-lg font-bold">برای گفتگو ابتدا وارد شوید</h1>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-md"
            onClick={() => setShowPhoneAuth(true)}
          >
            ورود
          </button>
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

          <div className="flex-1 overflow-y-auto p-3 pb-24 space-y-2 bg-gray-50">
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


