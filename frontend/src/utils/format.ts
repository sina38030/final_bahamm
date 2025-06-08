export const toFa = (n: number | string) =>
  n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

// src/utils/format.ts
export const comma = (n?: number) =>
  (typeof n === 'number' ? n : 0).toLocaleString('en-US');


