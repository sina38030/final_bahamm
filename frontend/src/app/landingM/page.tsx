import { ProductModalProvider } from '@/hooks/useProductModal';
import ClientLanding from './ClientLanding';

export const revalidate = 60;

export default async function Page({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const params = await searchParams;
  const invite = params?.invite ?? '';

  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001').replace(/\/$/, '');

  let initialProducts: any[] = [];
  try {
    const res = await fetch(`${backendUrl}/api/admin/products?order=landing`, { next: { revalidate: 60 } });
    if (res.ok) {
      initialProducts = await res.json();
    }
  } catch {}

  let initialGroupOrderData: any | null = null;
  let initialGroupMeta: any | null = null;
  if (invite) {
    try {
      const res = await fetch(`${backendUrl}/api/payment/group-invite/${encodeURIComponent(invite)}`, { next: { revalidate: 30 } });
      if (res.ok) {
        initialGroupOrderData = await res.json();
      }
    } catch {}
    try {
      // Use full backend URL for server-side fetch
      const grpRes = await fetch(`${backendUrl}/api/admin/group-buys/${encodeURIComponent(invite)}`, { next: { revalidate: 30 } });
      if (grpRes.ok) {
        initialGroupMeta = await grpRes.json();
      }
    } catch {}
  }

  return (
    <ProductModalProvider>
      <ClientLanding invite={invite} initialProducts={initialProducts} initialGroupOrderData={initialGroupOrderData} initialGroupMeta={initialGroupMeta} initialServerNowMs={typeof Date !== 'undefined' ? Date.now() : undefined} />
    </ProductModalProvider>
  );
}


