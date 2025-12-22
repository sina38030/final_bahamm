'use client';

import React, { useState } from 'react';
import { HiOutlineChevronDown, HiOutlineQuestionMarkCircle } from 'react-icons/hi2';
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-3 transition-all duration-200 hover:shadow-md">
            <button
                className="w-full px-5 py-4 text-right flex items-center justify-between gap-4"
                onClick={onClick}
            >
                <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-[#E31C5F] text-white' : 'bg-[#E31C5F]/10 text-[#E31C5F]'}`}>
                        <HiOutlineQuestionMarkCircle size={20} />
                    </div>
                    <span className={`font-bold text-sm sm:text-base ${isOpen ? 'text-[#E31C5F]' : 'text-gray-800'}`}>{question}</span>
                </div>
                <span className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#E31C5F]' : ''}`}>
                    <HiOutlineChevronDown size={20} />
                </span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="px-5 pb-5 pt-0 text-gray-600 text-sm leading-relaxed border-t border-gray-50 mt-2">
                    <div className="pt-3">
                        {answer}
                    </div>
                </div>
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
        <div className="min-h-screen bg-gray-50 pb-20">
            <PrevPage title="سوالات متداول" />
            <div className="px-4 mt-2">
                <div className="mb-6 text-center">
                    <p className="text-gray-500 text-sm">پاسخ پرتکرارترین سوالات شما</p>
                </div>
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
