"use client";

import { usePathname } from "next/navigation";
import BottomNavigation from "@/components/layout/BottomNavigation";
import React from "react";

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