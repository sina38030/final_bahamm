'use client';

import { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '@/utils/api';
import { safeStorage } from '@/utils/safeStorage';

type UploadedFile = {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt?: string;
};

export default function MediaUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const STORAGE_KEY = 'admin-media-files';

  // Load persisted media list on mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      
      const raw = safeStorage.getItem(STORAGE_KEY);
      console.log('📂 Loading from localStorage:', raw);
      
      if (raw) {
        const parsed = JSON.parse(raw) as UploadedFile[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(x => x && typeof x.url === 'string');
          console.log('✅ Loaded files:', valid.length);
          setFiles(valid);
        } else {
          console.log('⚠️ No valid files found in storage');
        }
      } else {
        console.log('ℹ️ No data in localStorage');
      }
      
      setIsLoaded(true);
    } catch (err) {
      console.error('❌ Error loading from localStorage:', err);
      setIsLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist whenever list changes (but only after initial load)
  useEffect(() => {
    if (!isLoaded) return; // Don't save until we've loaded
    
    try {
      if (typeof window === 'undefined') return;
      
      const dataToSave = JSON.stringify(files);
      safeStorage.setItem(STORAGE_KEY, dataToSave);
      console.log('💾 Saved to localStorage:', files.length, 'files');
      
      // Verify save
      const verify = safeStorage.getItem(STORAGE_KEY);
      if (verify === dataToSave) {
        console.log('✅ Save verified successfully');
      } else {
        console.error('❌ Save verification failed!');
      }
    } catch (err) {
      console.error('❌ Error saving to localStorage:', err);
    }
  }, [files, isLoaded]);

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files;
    if (!f || f.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      for (let i = 0; i < f.length; i++) form.append('file', f[i]);
      const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: form });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Upload failed');
      }
      const data = await res.json();
      const incoming: UploadedFile[] = Array.isArray(data?.files) ? data.files : [];
      // Add timestamp to each file
      const timestamped = incoming.map(f => ({
        ...f,
        uploadedAt: new Date().toISOString()
      }));
      setFiles((prev) => {
        const merged = [...timestamped, ...prev];
        const seen = new Set<string>();
        const deduped: UploadedFile[] = [];
        for (const item of merged) {
          const key = item?.url || '';
          if (!key || seen.has(key)) continue;
          seen.add(key);
          deduped.push(item);
        }
        return deduped;
      });
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      setError(err?.message || 'Upload error');
    } finally {
      setLoading(false);
    }
  };

  const addManualUrl = () => {
    const trimmed = manualUrl.trim();
    if (!trimmed) return;
    
    // Check if already exists
    if (files.some(f => f.url === trimmed)) {
      alert('این لینک قبلاً اضافه شده است');
      return;
    }

    const newFile: UploadedFile = {
      name: 'Manual Link',
      url: trimmed,
      size: 0,
      type: 'manual',
      uploadedAt: new Date().toISOString()
    };

    setFiles(prev => [newFile, ...prev]);
    setManualUrl('');
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(url);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      alert('خطا در کپی لینک');
    }
  };

  const deleteFile = (url: string) => {
    if (confirm('آیا از حذف این آیتم مطمئن هستید؟')) {
      setFiles(prev => prev.filter(f => f.url !== url));
    }
  };

  const clearAll = () => {
    if (confirm('آیا از حذف همه آیتم‌ها مطمئن هستید؟')) {
      setFiles([]);
    }
  };

  const checkLocalStorage = () => {
    if (typeof window === 'undefined') return;
    const raw = safeStorage.getItem(STORAGE_KEY);
    alert(`localStorage content:\n${raw || 'EMPTY'}`);
  };

  return (
    <div className="p-4">
      {/* Debug Panel */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <strong>🔍 Debug Info:</strong> {files.length} آیتم در حافظه | 
            {isLoaded ? ' ✅ بارگذاری شد' : ' ⏳ در حال بارگذاری...'}
          </div>
          <button
            onClick={checkLocalStorage}
            className="px-3 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-xs font-medium"
          >
            بررسی localStorage
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">آپلود و مدیریت رسانه</h2>
        
        {/* Upload Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">آپلود تصویر</h3>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            multiple
            onChange={onChange}
          />
          <button
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onPick}
            disabled={loading}
          >
            {loading ? '⏳ در حال آپلود…' : '📤 انتخاب و آپلود تصویر'}
          </button>
        </div>

        {/* Manual URL Input */}
        <div className="mb-6 border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">افزودن لینک دستی</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="لینک تصویر را وارد کنید..."
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addManualUrl()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addManualUrl}
              disabled={!manualUrl.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➕ افزودن
            </button>
          </div>
        </div>

        {error && <p className="text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      </div>

      {/* Saved Files Section */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">لینک‌های ذخیره شده ({files.length})</h3>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition text-sm font-medium"
            >
              🗑️ حذف همه
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((f) => (
              <div key={f.url} className="border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
                {/* Image Preview */}
                <div className="aspect-square relative overflow-hidden bg-gray-100">
                  <img 
                    src={f.url} 
                    alt={f.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/404.png';
                    }}
                  />
                </div>
                
                {/* Info Section */}
                <div className="p-4 bg-white">
                  {/* URL Display */}
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">🔗 لینک:</label>
                    <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs break-all font-mono text-gray-700">
                      {f.url}
                    </div>
                  </div>

                  {/* Upload Date */}
                  {f.uploadedAt && (
                    <div className="text-xs text-gray-500 mb-3">
                      📅 {new Date(f.uploadedAt).toLocaleString('fa-IR')}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button 
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        copySuccess === f.url 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                      onClick={() => copy(f.url)}
                    >
                      {copySuccess === f.url ? '✓ کپی شد!' : '📋 کپی لینک'}
                    </button>
                    <a 
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-center text-sm font-medium transition"
                      href={f.url} 
                      target="_blank" 
                      rel="noreferrer"
                    >
                      🔍 مشاهده
                    </a>
                    <button
                      className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-sm font-medium transition"
                      onClick={() => deleteFile(f.url)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
          <div className="text-6xl mb-4">📁</div>
          <p className="text-lg">هنوز هیچ رسانه‌ای ذخیره نشده است</p>
          <p className="text-sm mt-2">تصاویر خود را آپلود کنید یا لینک دستی اضافه کنید</p>
        </div>
      )}
    </div>
  );
}


