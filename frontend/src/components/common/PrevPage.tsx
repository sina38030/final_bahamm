"use client";

import { useRouter } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";

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
            className={`bg-white shadow-sm p-4   rounded-lg sticky top-0 py-2 mb-0 z-50 ${className}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center justify-between">
                    <p
                        onClick={() => router.back()}
                        className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <FaArrowLeft size={15} />
                    </p>
                    <h1 className="text-sm font-bold text-xs">{title}</h1>
                    <div></div>
                </div>
                {extra}
            </div>
        </div>
    );
}
