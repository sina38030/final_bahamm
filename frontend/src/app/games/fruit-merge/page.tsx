"use client";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with window/canvas/Matter.js
const FruitMergeGame = dynamic(() => import("./FruitMergeGame"), {
  ssr: false,
});

export default function Page() {
  return (
    <div className="min-h-[70vh] w-full flex items-start justify-center py-6">
      <FruitMergeGame />
    </div>
  );
}


