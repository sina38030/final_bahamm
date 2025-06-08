'use client';

import React, { useState } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa';
import PrevPage from '@/components/common/PrevPage';

type FAQItem = {
    question: string;
    answer: string;
};

const faqData: FAQItem[] = [
    {
        question: "چگونه می‌توانم سفارش خود را پیگیری کنم؟",
        answer: "شما می‌توانید با مراجعه به بخش 'لیست سفارش‌های من' در پروفایل خود، وضعیت سفارش خود را مشاهده و پیگیری کنید."
    },
    {
        question: "نحوه پرداخت چگونه است؟",
        answer: "ما روش‌های پرداخت متنوعی از جمله پرداخت آنلاین، کارت به کارت و پرداخت در محل را پشتیبانی می‌کنیم."
    },
    {
        question: "مدت زمان ارسال چقدر است؟",
        answer: "زمان تحویل بسته به موقعیت مکانی شما و نوع ارسال انتخابی متفاوت است. معمولاً بین 2 تا 5 روز کاری طول می‌کشد."
    },
    // Add more FAQ items as needed
];

function AccordionItem({ question, answer, isOpen, onClick }: FAQItem & { isOpen: boolean; onClick: () => void }) {
    return (
        <div className="border-b border-gray-200 last:border-b-0">
            <button
                className="w-full px-4 py-4 text-right flex items-center justify-between"
                onClick={onClick}
            >
                <span className="font-medium">{question}</span>
                <span className="text-primary">
                    {isOpen ? <FaMinus size={16} /> : <FaPlus size={16} />}
                </span>
            </button>
            <div
                className={`px-4 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-4' : 'max-h-0'
                    }`}
            >
                <p className="text-gray-600">{answer}</p>
            </div>
        </div>
    );
}

export default function FAQPage() {
    const [openItems, setOpenItems] = useState<number[]>([]);

    const toggleItem = (index: number) => {
        setOpenItems(prev =>
            prev.includes(index)
                ? prev.filter(item => item !== index)
                : [...prev, index]
        );
    };

    return (
        <div className="min-h-screen mx-auto  ">
            <PrevPage title="سوالات متداول" />
            <div className="bg-white rounded-lg shadow-sm">
                {faqData.map((item, index) => (
                    <AccordionItem
                        key={index}
                        {...item}
                        isOpen={openItems.includes(index)}
                        onClick={() => toggleItem(index)}
                    />
                ))}
            </div>
        </div>
    );
} 