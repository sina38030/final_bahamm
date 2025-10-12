"use client";

import React from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { GroupBuyResultProvider } from "@/components/providers/GroupBuyResultProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GroupBuyResultProvider>
        {children}
      </GroupBuyResultProvider>
    </AuthProvider>
  );
} 