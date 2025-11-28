const STORAGE_PREFIX = 'payment_role_hint_';
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours

type PaymentRole = 'invitee' | 'leader' | 'solo' | 'settlement';

export interface PaymentRoleHint {
  role: PaymentRole;
  isInvited?: boolean;
  inviteCode?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: number;
}

const getKey = (authority: string) => `${STORAGE_PREFIX}${authority}`;

export function rememberPaymentRoleHint(authority?: string | null, hint?: PaymentRoleHint) {
  if (typeof window === 'undefined') return;
  if (!authority || !hint) return;
  try {
    const payload: PaymentRoleHint = {
      ...hint,
      createdAt: Date.now(),
    };
    localStorage.setItem(getKey(authority), JSON.stringify(payload));
  } catch (err) {
    console.warn('[paymentRoleHint] Failed to remember role hint', err);
  }
}

export function readPaymentRoleHint(authority?: string | null): PaymentRoleHint | null {
  if (typeof window === 'undefined') return null;
  if (!authority) return null;
  try {
    const raw = localStorage.getItem(getKey(authority));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PaymentRoleHint;
    if (parsed?.createdAt && Date.now() - parsed.createdAt > MAX_AGE_MS) {
      localStorage.removeItem(getKey(authority));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPaymentRoleHint(authority?: string | null) {
  if (typeof window === 'undefined') return;
  if (!authority) return;
  try {
    localStorage.removeItem(getKey(authority));
  } catch {}
}

