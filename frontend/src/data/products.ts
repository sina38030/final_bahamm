export type Product = {
  id: number;
  cat: 'fruit' | 'veg' | 'basket';
  img: number;
  name: string;
  weight: string;
  star: string;
  sales: string;
  price: number;
};

export const PRODUCTS: Product[] = [
  { id: 1, cat: 'fruit', img: 21, name: 'پرتقال تامسون درجه ۱', weight: '۱ کیلوگرم ± ۱۰۰ گرم', star: '۴٫۶', sales: '۲۵۰', price: 28250 },
  { id: 2, cat: 'fruit', img: 22, name: 'سیب قرمز ممتاز',        weight: '۱ کیلوگرم ± ۵۰ گرم',  star: '۴٫۵', sales: '۱۲۰', price: 35000 },
  { id: 3, cat: 'fruit', img: 23, name: 'کیوی طلایی',            weight: '۵۰۰ گرم',             star: '۴٫۷', sales: '۳۴',  price: 30000 },
  { id: 4, cat: 'fruit', img: 24, name: 'موز اکوادوری',          weight: '۱ کیلوگرم',           star: '۴٫۳', sales: '۵۳۰', price: 39000 },
  { id: 5, cat: 'fruit', img: 25, name: 'انگور بی‌دانه',         weight: '۷۵۰ گرم',            star: '۴٫۸', sales: '۲۰',  price: 45000 },
  { id: 6, cat: 'fruit', img: 26, name: 'هلو زعفرانی',           weight: '۱ کیلوگرم',           star: '۴٫۲', sales: '۴۸',  price: 37000 },
];
