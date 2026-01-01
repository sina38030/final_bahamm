import { API_BASE_URL } from "@/utils/api";

type ResolveGroupResponse = { id?: string | number } & Record<string, any>;

function isNumericId(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

/**
 * Resolve any group identifier (numeric id, invite token, legacy GB code) to a numeric group id.
 *
 * Important: we intentionally resolve through the backend `/groups/{group_id}` endpoint
 * because nginx proxies `/api` to the backend in production and that endpoint already
 * supports non-numeric identifiers.
 */
export async function resolveGroupNumericId(groupIdOrCode: string): Promise<string> {
  const raw = String(groupIdOrCode || "").trim();
  if (!raw) throw new Error("groupId is required");
  if (isNumericId(raw)) return raw;

  const res = await fetch(`${API_BASE_URL}/groups/${encodeURIComponent(raw)}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to resolve group id (${res.status})`);
  }

  const j: ResolveGroupResponse = await res.json().catch(() => ({} as any));
  const id = j?.id != null ? String(j.id).trim() : "";
  if (!id || !isNumericId(id)) {
    throw new Error("Invalid group id response");
  }
  return id;
}

/**
 * Finalize a group buy (admin endpoint).
 *
 * We call the backend directly (via API_BASE_URL) to avoid nginx routing `/api/*`
 * to the backend and returning 405 for Next.js API routes.
 */
export async function finalizeGroupBuy(groupIdOrCode: string): Promise<Response> {
  const gid = await resolveGroupNumericId(groupIdOrCode);
  return await fetch(`${API_BASE_URL}/admin/group-buys/${encodeURIComponent(gid)}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: true }),
  });
}

















