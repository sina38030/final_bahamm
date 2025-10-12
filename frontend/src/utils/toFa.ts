export const toFa = (val: unknown): string => {
  if (val === null || val === undefined) return '۰';
  const str = (typeof val === 'number' || typeof val === 'string')
    ? val.toString()
    : '';                                  // هر نوع ناشناخته → رشتهٔ خالی
  return str.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d as number]);
};
