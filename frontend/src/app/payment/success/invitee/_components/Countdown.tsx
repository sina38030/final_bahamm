"use client";

import { useState, useEffect } from "react";

interface CountdownProps {
  targetTs: string; // ISO timestamp
  onExpired?: () => void;
}

// Convert Western digits to Persian digits
const toPersianDigits = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
};

// Format time with Persian digits and colons
const formatTime = (hours: number, minutes: number, seconds: number): string => {
  const h = toPersianDigits(hours);
  const m = toPersianDigits(minutes);
  const s = toPersianDigits(seconds);
  return `${h.padStart(2, '۰')} : ${m.padStart(2, '۰')} : ${s.padStart(2, '۰')}`;
};

export default function Countdown({ targetTs, onExpired }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetTs).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        onExpired?.();
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    // Calculate immediately
    calculateTimeLeft();

    // Set up interval to update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetTs, onExpired]);

  const Chip = ({ value }: { value: string }) => (
    <div className="w-11 h-11 rounded-full border border-gray-300 bg-white flex items-center justify-center text-gray-900 text-lg font-bold font-mono">
      {value}
    </div>
  );

  if (timeLeft.isExpired) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          زمان به اتمام رسید
        </div>
      </div>
    );
  }

  const h = toPersianDigits(timeLeft.hours).padStart(2, '۰');
  const m = toPersianDigits(timeLeft.minutes).padStart(2, '۰');
  const s = toPersianDigits(timeLeft.seconds).padStart(2, '۰');

  return (
    <div className="text-center py-1">
      <div className="flex items-center justify-center gap-3">
        <Chip value={h} />
        <span className="text-gray-500 font-bold">:</span>
        <Chip value={m} />
        <span className="text-gray-500 font-bold">:</span>
        <Chip value={s} />
      </div>
    </div>
  );
}