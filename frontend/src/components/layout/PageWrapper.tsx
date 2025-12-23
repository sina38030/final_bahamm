"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import React from "react";

// Dynamically import BottomNavigation with SSR disabled to prevent hydration mismatches
// The component relies on client-side state (pathname, auth, localStorage) that differs from server
const BottomNavigation = dynamic(
  () => import("@/components/layout/BottomNavigation"),
  { 
    ssr: false,
    loading: () => (
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-16 z-40"
        style={{ opacity: 0 }}
      />
    )
  }
);

export default function PageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      {children}
      <BottomNavigation />
    </>
  );
}
