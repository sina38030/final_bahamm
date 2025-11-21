import { getApiBase } from '@/utils/serverBackend';
import ClientLanding from './ClientLanding';

export const revalidate = 60;

export default async function Page({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const params = await searchParams;
  const invite = params?.invite ?? '';

  const apiBase = getApiBase();

  let initialProducts: any[] = [];
  try {
    const res = await fetch(`${apiBase}/admin/products?order=landing`, { next: { revalidate: 60 } });
    console.log(`[landingM/page] Products fetch: ${res.status} from ${apiBase}/admin/products?order=landing`);
    if (res.ok) {
      initialProducts = await res.json();
      console.log(`[landingM/page] Products loaded: ${initialProducts?.length || 0} items`);
    } else {
      console.error(`[landingM/page] Products fetch failed: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error('[landingM/page] Products fetch error:', err);
  }

  let initialGroupOrderData: any | null = null;
  let initialGroupMeta: any | null = null;
  if (invite) {
    try {
      const res = await fetch(`${apiBase}/payment/group-invite/${encodeURIComponent(invite)}`, { next: { revalidate: 30 } });
      console.log(`[landingM/page] Group invite fetch: ${res.status}`);
      if (res.ok) {
        initialGroupOrderData = await res.json();
        console.log(`[landingM/page] Group data loaded:`, initialGroupOrderData?.items?.length || 0, 'items');
      }
    } catch (err) {
      console.error('[landingM/page] Group invite fetch error:', err);
    }
    try {
      const grpRes = await fetch(`${apiBase}/groups/${encodeURIComponent(invite)}`, { next: { revalidate: 30 } });
      if (grpRes.ok) {
        initialGroupMeta = await grpRes.json();
      }
    } catch {}
  }

  return (
    <ClientLanding invite={invite} initialProducts={initialProducts} initialGroupOrderData={initialGroupOrderData} initialGroupMeta={initialGroupMeta} initialServerNowMs={typeof Date !== 'undefined' ? Date.now() : undefined} />
  );
}


