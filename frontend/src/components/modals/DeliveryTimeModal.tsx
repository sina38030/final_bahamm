"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '@/utils/api';

interface DeliverySlot {
  id: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface DeliveryDay {
  date: string;
  day_off: boolean;
  slots: DeliverySlot[];
}

interface DeliveryTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSlot: (slot: { date: string; from: string; to: string; delivery_slot: string }) => void;
  targetDate?: string; // Optional ISO date string for the target day, defaults to tomorrow
}

const DeliveryTimeModal: React.FC<DeliveryTimeModalProps> = ({
  isOpen,
  onClose,
  onSelectSlot,
  targetDate
}) => {
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [displayDate, setDisplayDate] = useState<string>('');

  // Always calculate target date based on Tehran timezone: today(Tehran) + 1 day
  // Ensures leaders see the next working day's slots regardless of client timezone
  const actualTargetDate = useMemo(() => {
    const toTehranIso = (input: Date | string) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tehran',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(typeof input === 'string' ? new Date(input) : input);

    const addDaysIso = (iso: string, n: number) => {
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() + n);
      return dt.toISOString().slice(0, 10);
    };

    const todayIsoTehran = toTehranIso(new Date());
    const tIso = addDaysIso(todayIsoTehran, 1);

    console.log('DeliveryTimeModal: Tehran-based target date:', tIso, '(today Tehran:', todayIsoTehran, ')');
    return tIso;
  }, [isOpen]); // Recalculate when modal opens

  useEffect(() => {
    if (isOpen) {
      console.log('DeliveryTimeModal: Opening for date:', actualTargetDate);
      fetchDeliverySlots();
    }
  }, [isOpen, actualTargetDate]);

  // Auto-refresh delivery slots every 30 seconds
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      console.log('Auto-refreshing delivery slots...');
      fetchDeliverySlots();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isOpen, actualTargetDate]);

  const fetchDeliverySlots = async () => {
    console.log('fetchDeliverySlots called with actualTargetDate:', actualTargetDate);
    console.log('Current time when fetching slots:', new Date().toISOString());
    setLoading(true);
    setError(null);
    try {
      // Fetch delivery slots for the next 14 days to ensure we get the target date
      console.log('Making API call to: /api/admin/delivery-slots/next?days=14');
      console.log('Environment BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);

      const response = await fetch(`${API_BASE_URL}/admin/delivery-slots/next?days=14`, {
        cache: 'no-store' // اطمینان از دریافت داده‌های تازه
      });

      console.log('Frontend API response received:', response.status);

      console.log('Response received:', response.status, response.statusText);
      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to fetch delivery slots: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);

      // Find the target date in the response
      console.log('DeliveryTimeModal: Available days:', data.days?.map(d => d.date));
      console.log('DeliveryTimeModal: Looking for target date:', actualTargetDate);

      const targetDay = data.days?.find((day: DeliveryDay) =>
        day.date === actualTargetDate
      );

      console.log('DeliveryTimeModal: Found target day:', targetDay);
      console.log('All available days from API:', data.days?.map(d => ({ date: d.date, hasSlots: d.slots?.length > 0, dayOff: d.day_off })));

      // First try to use the target date (tomorrow) if available
      if (targetDay && !targetDay.day_off && targetDay.slots && targetDay.slots.length > 0) {
        const activeSlots = targetDay.slots?.filter((slot: DeliverySlot) => slot.is_active) || [];
        console.log('DeliveryTimeModal: Using target date with active slots:', activeSlots.length);
        
        if (activeSlots.length > 0) {
          setSlots(activeSlots);
          setLastUpdated(new Date());
          setDisplayDate(targetDay.date);
          setError(null);
          return;
        }
      }

      // If target date is not available, find the next available day
      console.log('Target date not available, looking for next available day after:', actualTargetDate);

      const allDays = (data.days || []);
      console.log('All days from API:', allDays.map(d => ({ date: d.date, slots: d.slots?.length || 0, dayOff: d.day_off })));

      const availableDays = allDays
        .filter((day: DeliveryDay) => !day.day_off && day.slots && day.slots.length > 0)
        .sort((a: DeliveryDay, b: DeliveryDay) => a.date.localeCompare(b.date));

      console.log('Available days (filtered):', availableDays.map(d => ({ date: d.date, slots: d.slots?.length || 0 })));

      // Find the first day AFTER the target date
      const nextAvailableDay = availableDays.find((day: DeliveryDay) => day.date > actualTargetDate);
      console.log('Next available day found:', nextAvailableDay);

      if (nextAvailableDay) {
        console.log('Found next available day:', nextAvailableDay.date);
        const activeSlots = nextAvailableDay.slots?.filter((slot: DeliverySlot) => slot.is_active) || [];
        console.log('DeliveryTimeModal: Active slots found for next available day:', activeSlots.length, 'slots');

        setSlots(activeSlots);
        setLastUpdated(new Date());
        setDisplayDate(nextAvailableDay.date);
        
        if (activeSlots.length > 0) {
          setError(`زمان‌های ${nextAvailableDay.date} نمایش داده می‌شود (${actualTargetDate} در دسترس نیست)`);
        } else {
          setError(`زمان‌های ${nextAvailableDay.date} نمایش داده می‌شود اما اسلاتی موجود نیست`);
        }
        return;
      }

      if (targetDay && !targetDay.day_off) {
        const activeSlots = targetDay.slots?.filter((slot: DeliverySlot) => slot.is_active) || [];
        console.log('DeliveryTimeModal: Active slots found:', activeSlots);
        console.log('Setting slots in state:', activeSlots.length, 'slots');
        setSlots(activeSlots);
        setLastUpdated(new Date());
        setDisplayDate(targetDay.date); // Set the actual date being displayed
        setError(null); // Clear any previous errors
      } else {
        console.log('DeliveryTimeModal: Target date found but is day off or has no slots');
        
        // If the target day is off or has no slots, find the next available day
        const availableDays = (data.days || [])
          .filter((day: DeliveryDay) => !day.day_off && day.slots && day.slots.length > 0)
          .sort((a: DeliveryDay, b: DeliveryDay) => a.date.localeCompare(b.date));
        
        const nextAvailableDay = availableDays.find((day: DeliveryDay) => day.date > actualTargetDate);
        
        if (nextAvailableDay) {
          const allSlots = nextAvailableDay.slots?.filter((slot: DeliverySlot) => slot.is_active) || [];
          console.log('DeliveryTimeModal: Using slots from next available day:', nextAvailableDay.date, allSlots);
          setSlots(allSlots);
          setLastUpdated(new Date());
          setDisplayDate(nextAvailableDay.date); // Set the actual date being displayed
          setError(`زمان‌های ${nextAvailableDay.date} نمایش داده می‌شود (${actualTargetDate} در دسترس نیست)`);
        } else {
          setSlots([]);
          setLastUpdated(new Date());
          setError('هیچ زمان ارسالی در روزهای آینده موجود نیست');
        }
      }
    } catch (err) {
      console.error('Error in fetchDeliverySlots:', err);

      // Fallback: اگر API شکست خورد، داده‌های آزمایشی نمایش بده
      console.log('Using fallback data due to API error');
      const fallbackData = {
        days: [
          {
            date: actualTargetDate,
            day_off: false,
            slots: [
              {
                id: 1,
                start_time: '10:00',
                end_time: '12:00',
                is_active: true
              },
              {
                id: 2,
                start_time: '14:00',
                end_time: '16:00',
                is_active: true
              }
            ]
          }
        ]
      };

      const targetDay = fallbackData.days.find(day => day.date === actualTargetDate);
      if (targetDay && !targetDay.day_off) {
        const activeSlots = targetDay.slots.filter(slot => slot.is_active);
        setSlots(activeSlots);
        setDisplayDate(targetDay.date); // Set the actual date being displayed
        setError('⚠️ داده‌های آزمایشی نمایش داده می‌شود - اتصال به سرور برقرار نیست');
      } else {
        setError(`خطا در دریافت زمان‌های ارسال: ${(err as Error).message || 'خطای نامشخص'}`);
      }

      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: DeliverySlot) => {
    setSelectedSlotId(slot.id);

    // Format the time slot for display and storage
    const selectedDate = displayDate || actualTargetDate;
    const formattedSlot = {
      date: selectedDate,
      from: slot.start_time,
      to: slot.end_time,
      delivery_slot: `${selectedDate} ${slot.start_time}-${slot.end_time}`
    };

    onSelectSlot(formattedSlot);
    onClose();
  };

  const formatPersianDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const persianDate = date.toLocaleDateString('fa-IR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      console.log('Formatting date:', dateString, '→', persianDate);
      return persianDate;
    } catch {
      console.error('Error formatting date:', dateString);
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    // Convert 24h format to 12h format with Persian numbers
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'بعد از ظهر' : 'صبح';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 pb-[max(16px,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto z-[1001]">
        <div className="h-1.5 w-10 bg-gray-300 rounded-full mx-auto mb-3" />
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-semibold text-gray-800">انتخاب زمان ارسال</h2>
          <div className="flex gap-2">
            <button
              onClick={fetchDeliverySlots}
              disabled={loading}
              className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
              title="بروزرسانی لیست زمان‌ها"
            >
              🔄
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="بستن"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm text-gray-600">
            تاریخ ارسال: {displayDate ? formatPersianDate(displayDate) : formatPersianDate(actualTargetDate)}
          </p>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="text-gray-600">در حال بارگذاری...</div>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <div className="text-red-600">{error}</div>
          </div>
        )}

        {!loading && !error && slots.length === 0 && (
          <div className="text-center py-4">
            <div className="text-gray-600">زمان ارسال موجودی برای این تاریخ وجود ندارد</div>
            <div className="text-xs text-gray-500 mt-2">اگر زمان‌ها را در سیستم مدیریت تغییر داده‌اید، لطفاً دکمه بروزرسانی را کلیک کنید</div>
          </div>
        )}

        {!loading && slots.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-3">
              زمان‌های موجود: ({slots.length} اسلات)
              {error && error.includes('داده‌های آزمایشی') && (
                <span className="text-orange-500 text-xs mr-2">(آزمایشی)</span>
              )}
            </p>
            {slots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => handleSlotSelect(slot)}
                className={`w-full p-3 rounded-lg border text-right transition-colors ${
                  selectedSlotId === slot.id
                    ? 'border-custom-pink bg-custom-pink/10 text-custom-pink'
                    : 'border-gray-200 hover:border-custom-pink/30 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">
                  {formatTime(slot.start_time)} تا {formatTime(slot.end_time)}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">انصراف</button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTimeModal;
