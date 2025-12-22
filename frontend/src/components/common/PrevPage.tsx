"use client";

import { useRouter } from "next/navigation";
import { FaArrowRight } from "react-icons/fa";

type PrevPageProps = {
    title: string;
    className?: string;
    extra?: React.ReactNode;
};

export default function PrevPage({
    title,
    className = "",
    extra,
}: PrevPageProps) {
    const router = useRouter();

    return (
        <div
            className={`bg-white shadow-sm p-4 rounded-b-2xl sticky top-0 py-4 mb-4 z-50 ${className}`}
        >
            <div className="relative flex items-center justify-center">
                <button
                    onClick={() => router.back()}
                    className="absolute right-0 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                >
                    <FaArrowRight size={18} />
                </button>
                <h1 className="text-base font-bold text-gray-800">{title}</h1>
                {extra && <div className="absolute left-0">{extra}</div>}
            </div>
        </div>
    );
}
