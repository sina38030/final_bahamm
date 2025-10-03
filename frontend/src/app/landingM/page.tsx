cat > /srv/app/frontend/frontend/src/app/landingM/page.tsx <<'TS'
// @ts-nocheck
import { ProductModalProvider } from '@/hooks/useProductModal';
import ClientLanding from './ClientLanding';

export const revalidate = 60;

type LandingSearchParams = { invite?: string };

export default async function Page(props: any) {
  const raw = props?.searchParams;
  const sp: LandingSearchParams =
    raw && typeof raw?.then === 'function' ? await raw : (raw ?? {});
  const invite = sp.invite ?? '';

  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001').replace(/\/$/, '');

  let initialProducts: any[] = [];
  try {
    const res = await fetch(`${backendUrl}/api/admin/products`, { next: { revalidate: 60 } });
    if (res.ok) initialProducts = await res.json();
  } catch {}

  let initialGroupOrderData: any | null = null;
  let initialGroupMeta: any | null = null;

  if (invite) {
    try {
      const res = await fetch(`${backendUrl}/api/payment/group-invite/${encodeURIComponent(invite)}`, { next: { revalidate: 30 } });
      if (res.ok) initialGroupOrderData = await res.json();
    } catch {}

    try {
      const grpRes = await fetch(`/api/groups/${encodeURIComponent(invite)}`, { next: { revalidate: 30 } });
      if (grpRes.ok) initialGroupMeta = await grpRes.json();
    } catch {}
  }

  return (
    <ProductModalProvider>
      <ClientLanding
        invite={invite}
        initialProducts={initialProducts}
        initialGroupOrderData={initialGroupOrderData}
        initialGroupMeta={initialGroupMeta}
        initialServerNowMs={typeof Date !== 'undefined' ? Date.now() : undefined}
      />
    </ProductModalProvider>
  );
}
TS
