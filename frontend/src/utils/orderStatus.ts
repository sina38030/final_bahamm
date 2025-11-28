/**
 * Order status helpers shared across pages.
 */

/**
 * Returns true when an order's status indicates it has been delivered/
 * completed and is eligible for collecting a review from the user.
 */
export function isReviewEligibleStatus(statusRaw?: string | null): boolean {
  if (!statusRaw) return false;
  const raw = String(statusRaw).trim();
  if (!raw) return false;
  const lowered = raw.toLowerCase();

  if (raw.includes("تحویل") || raw.includes("تکمیل")) {
    return true;
  }

  return /deliver|delivered|delivery|complete|completed|fulfilled|done|success/.test(lowered);
}








