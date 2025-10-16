"use client";

import { useState } from "react";
import { Group } from "@/types/group";
import { SecondaryPricingTiers } from "@/types/pricing";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  pricingTiers: SecondaryPricingTiers;
}

// Convert Western digits to Persian digits
const toPersianDigits = (str: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
};

// Format currency with Persian digits
const formatCurrency = (amount: number): string => {
  return toPersianDigits(amount.toLocaleString('fa-IR')) + ' تومان';
};

export default function ShareModal({
  isOpen,
  onClose,
  group,
  pricingTiers,
}: ShareModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = typeof window !== 'undefined' && group.shareUrl
    ? `${window.location.origin}${group.shareUrl}`
    : group.shareUrl || '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'دعوت به خرید گروهی',
          text: 'به گروه خرید من بپیوندید و با تخفیف خرید کنید!',
          url: inviteUrl,
        });
      } catch (err) {
        console.error('Native share failed:', err);
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            دعوت دوستان
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Pricing Tiers */}
          <div className="bg-gradient-to-b from-green-50 to-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <h3 className="text-emerald-800 font-semibold mb-3 text-center">
              قیمت‌های شما بر اساس تعداد دوستان:
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-emerald-700 font-medium">
                  {formatCurrency(pricingTiers.leaderPrices.with1Friend)}
                </span>
                <span className="text-gray-700">
                  با ۱ دوست:
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700 font-medium">
                  {formatCurrency(pricingTiers.leaderPrices.with2Friends)}
                </span>
                <span className="text-gray-700">
                  با ۲ دوست:
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700 font-medium">
                  {formatCurrency(pricingTiers.leaderPrices.with3Friends)}
                </span>
                <span className="text-gray-700">
                  با ۳ دوست:
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-emerald-700 font-bold text-lg">
                  رایگان! 🎉
                </span>
                <span className="text-gray-700 font-semibold">
                  با ۴ دوست:
                </span>
              </div>
            </div>
          </div>

          {/* Invitee Price */}
          <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
            <p className="text-blue-800 text-sm mb-1">
              قیمت برای دوستان شما:
            </p>
            <p className="text-blue-700 font-bold text-lg">
              {formatCurrency(pricingTiers.inviteePrice)}
            </p>
          </div>

          {/* Share Link */}
          <div className="space-y-3">
            <label className="block text-gray-700 font-medium text-right">
              لینک دعوت:
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  copySuccess
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {copySuccess ? 'کپی شد!' : 'کپی'}
              </button>
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                اشتراک‌گذاری
              </button>
            )}
            <button
              onClick={handleCopyLink}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              کپی لینک دعوت
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-800 text-center border border-amber-100">
            <p>
              لینک را با دوستان خود به اشتراک بگذارید تا آن‌ها بتوانند به گروه شما بپیوندند
              و شما بر اساس تعداد اعضا تخفیف یا بازپرداخت دریافت کنید!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}