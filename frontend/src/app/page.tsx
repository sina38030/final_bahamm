import HomeClient from './HomeClient';

export const revalidate = 60;

function mapProducts(items: any[]): any[] {
  return items.map((bp: any) => ({
    id: bp.id,
    name: bp.name,
    price: bp.solo_price || bp.market_price || bp.base_price,
    base_price: bp.base_price,
    market_price: bp.market_price,
    solo_price: bp.solo_price,
    friend_1_price: bp.friend_1_price,
    friend_2_price: bp.friend_2_price,
    friend_3_price: bp.friend_3_price,
    cat: bp.category?.toLowerCase().includes('میوه') ? 'fruit' :
         bp.category?.toLowerCase().includes('سبزی') ? 'veg' :
         bp.category?.toLowerCase().includes('الکترونیک') ? 'basket' :
         bp.category?.toLowerCase().includes('پوشاک') ? 'basket' : 'basket',
    img: Array.isArray(bp.images) && bp.images.length > 0 ? String(bp.images[0]) : (bp.image ? String(bp.image) : ''),
    images: Array.isArray(bp.images) ? bp.images : (bp.image ? [bp.image] : []),
    weight: (bp.weight_grams ? bp.weight_grams : 0),
    weight_tolerance: (bp.weight_tolerance_grams ?? undefined),
    star: (bp.display_rating ?? 0),
    sales: (bp.display_sales ?? 0),
    category: bp.category
  }));
}

export default async function Home() {
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001').replace(/\/$/, '');

  let initialProductsRaw: any[] = [];
  let initialBanners: any[] = [];

  try {
    const res = await fetch(`${backendUrl}/api/admin/products?limit=20&skip=0&order=home`, { next: { revalidate: 60 } });
    if (res.ok) {
      const items = await res.json();
      initialProductsRaw = mapProducts(items);
    }
  } catch {}

  if (!initialProductsRaw.length) {
    try {
      const res = await fetch(`${backendUrl}/api/products?page=1&limit=20`, { next: { revalidate: 60 } });
      if (res.ok) {
        const items = await res.json();
        initialProductsRaw = mapProducts(items);
      }
    } catch {}
  }

  try {
    const bannersRes = await fetch(`${backendUrl}/api/banners`, { next: { revalidate: 300 } });
    if (bannersRes.ok) {
      initialBanners = await bannersRes.json();
    }
  } catch {}

  return (
    <HomeClient initialProductsRaw={initialProductsRaw} initialBanners={initialBanners} />
  );
}
