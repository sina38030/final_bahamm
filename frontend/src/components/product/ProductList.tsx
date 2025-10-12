import React from 'react';
import { PRODUCTS } from '@/data/products';
import ProductCard from './ProductCard'; // فرض بر این است که یک کامپوننت ProductCard دارید

export default function ProductList() {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">لیست محصولات</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {PRODUCTS.map((product) => (
                    <ProductCard key={product.id} p={product} />
                ))}
            </div>
        </div>
    );
}