"use client";

import { usePathname } from "next/navigation";
import BottomNavigation from "@/components/layout/BottomNavigation";
import CartBottomNav from "@/components/layout/CartBottomNav";
import React from "react";

export default function PageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showCartBottomNav = pathname === "/";

  return (
    <>
      {children}
      <BottomNavigation />
      {showCartBottomNav && <CartBottomNav />}
    </>
  );
} 