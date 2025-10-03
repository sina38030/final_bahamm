export const toFa = (n?: number | string | null) => {
  if (n == null) return '۰';
  return n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
};

// src/utils/format.ts
export const comma = (n?: number | null) => {
  if (n == null || isNaN(n)) return '0';
  return n.toLocaleString('en-US');
};


