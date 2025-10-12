'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import { HomeCtx } from '@/contexts/HomeContext';
import { API_BASE_URL } from '@/utils/api';

type Category = {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
};

export default function Categories() {
  const { cat, setCat } = useContext(HomeCtx);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allIcon, setAllIcon] = useState<string | null>(null);
  const [allLabel, setAllLabel] = useState<string>('همه');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Prefer public categories endpoint on the storefront
        const base = API_BASE_URL.replace(/\/api$/, '');
        const [catsRes, settingsRes] = await Promise.all([
          fetch(`${base}/api/categories`),
          fetch(`${base}/api/settings`).catch(() => null as any),
        ]);
        if (catsRes?.ok) {
          const data: Category[] = await catsRes.json();
          if (alive) setCategories(data);
        }
        if (settingsRes && settingsRes.ok) {
          const js = await settingsRes.json();
          if (alive) {
            setAllIcon(js?.all_category_image || null);
            setAllLabel(js?.all_category_label || 'همه');
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => { alive = false; };
  }, []);

  const items = useMemo(() => {
    return [
      { key: 'all', label: allLabel || 'همه', image_url: allIcon || '/img/icons/all.svg' },
      ...categories.map(c => ({ key: c.slug, label: c.name, image_url: c.image_url || undefined }))
    ];
  }, [categories, allIcon, allLabel]);

  return (
    <div className="categories">
      {items.map(c => (
        <div
          key={c.key}
          className={`cat-item ${(c.key === 'all' ? cat === 'all' : cat === c.label) ? 'active' : ''}`}
          onClick={() => setCat(c.key === 'all' ? 'all' : c.label)}
        >
          <div className="cat-icon">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.image_url || '/img/icons/all.svg'} alt={c.label} />
          </div>
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
