"use client";

import { useState } from "react";
import { Group } from "@/types/group";
import { Order } from "@/types/order";
import { SecondaryPricingTiers } from "@/types/pricing";
import { groupApi, withIdempotency } from "@/lib/api";
import ShareModal from "./ShareModal";

interface InviteCtaProps {
  order: Order;
  group: Group;
  pricingTiers: SecondaryPricingTiers;
  isExpired: boolean;
  onGroupCreated?: (group: Group) => void;
}

export default function InviteCta({
  order,
  group,
  pricingTiers,
  isExpired,
  onGroupCreated,
}: InviteCtaProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteDisabled = isExpired;

  const handleCreateGroup = async () => {
    if (inviteDisabled) return;

    try {
      setIsCreating(true);
      setError(null);

      // Call the new simplified API that only needs the order ID
      // Backend handles all the logic (expiry, token generation, etc.)
      const result = await groupApi.createSecondaryGroup(order.id);

      // Convert result to Group format for compatibility
      const newGroup = {
        id: result.group_order_id,
        invite_token: result.invite_token,
        expires_at: result.expires_at,
        // Add other required Group fields as needed
      } as any;

      setCreatedGroup(newGroup);
      setIsShareModalOpen(true);
      onGroupCreated?.(newGroup);
    } catch (err) {
      console.error('Failed to create group:', err);
      setError(err instanceof Error ? err.message : 'خطا در ایجاد گروه');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenShareModal = () => {
    setIsShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
  };

  // If group is already created (from props or state), show share button
  const groupToShare = createdGroup || (group.kind === 'secondary' ? group : null);

  if (isExpired) {
    return (
      <div className="text-center py-6">
        <div className="bg-gray-100 text-gray-600 py-3 px-6 rounded-lg font-semibold">
          زمان به اتمام رسید
        </div>
        <p className="text-sm text-gray-500 mt-2">
          امکان ایجاد گروه جدید وجود ندارد
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Green headline */}
      <div className="text-center">
        <h2 className="text-emerald-700 font-extrabold text-base mb-1">
          گروه جدید تشکیل بده و کل پرداختت رو پس بگیر!
        </h2>
        <p className="text-gray-600 text-sm">
          با دعوت دوستان، تا ۱۰۰٪ پولت رو پس بگیر
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {/* Action button */}
      <div className="space-y-3">
        {groupToShare ? (
          <button
            onClick={handleOpenShareModal}
            className="w-full bg-rose-500 text-white py-4 px-6 rounded-xl font-bold text-base hover:bg-rose-600 transition-colors shadow-sm"
          >
            دعوت دوستان
          </button>
        ) : (
          <button
            onClick={handleCreateGroup}
            disabled={isCreating}
            className={`w-full py-4 px-6 rounded-xl font-bold text-base transition-colors shadow-sm ${
              isCreating
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-rose-500 text-white hover:bg-rose-600'
            }`}
          >
            {isCreating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                در حال ایجاد گروه...
              </div>
            ) : (
              'دعوت دوستان'
            )}
          </button>
        )}

        {/* Secondary button - Track order */}
        <button
          onClick={() => window.location.href = `/orders/${order.id}`}
          className="w-full border border-rose-300 text-rose-600 bg-white py-3 px-6 rounded-xl font-semibold hover:bg-rose-50 transition-colors"
        >
          پیگیری سفارش
        </button>
      </div>

      {/* Share Modal */}
      {groupToShare && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={handleCloseShareModal}
          group={groupToShare}
          pricingTiers={pricingTiers}
        />
      )}
    </div>
  );
}