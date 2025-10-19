import { API_BASE_URL } from "@/utils/api";

export function withIdempotency(headers: HeadersInit = {}): HeadersInit {
  return { ...headers, "X-Idempotency-Key": crypto.randomUUID() };
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // Soft-fail for 5xx/HTML responses in production
    try {
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error('سرور موقتا در دسترس نیست');
      }
      const j = await res.json();
      // @ts-ignore
      if (j && j.success === false) {
        throw new Error(j.error || 'در دسترس نیست');
      }
      // Re-throw as stringified json
      throw new Error(JSON.stringify(j));
    } catch (e: any) {
      const msg = e?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
  }
  return res.json();
}

export const api = {
  async get<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      method: "GET",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });
    return json<T>(res);
  },
  async post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return json<T>(res);
  },
};

// Specific API functions for the invitee success page
export const orderApi = {
  getOrder: (orderId: string) => api.get<import("@/types/order").Order>(`/orders/${orderId}`),
};

export const groupApi = {
  getGroup: (groupId: string) => api.get<import("@/types/group").Group>(`/groups/${groupId}`),
  createSecondaryGroup: (data: {
    kind: "secondary";
    source_group_id?: string | number;
    source_order_id: string | number;
    leader_user_id?: string | number;
    expires_at?: string;
  }, headers?: HeadersInit) => 
    api.post<import("@/types/group").Group>("/groups", data, { headers }),
};

export const pricingApi = {
  getSecondaryPricingTiers: (orderId: string) => 
    api.get<import("@/types/pricing").SecondaryPricingTiers>(`/pricing/tiers?type=secondary&order_id=${orderId}`),
};


