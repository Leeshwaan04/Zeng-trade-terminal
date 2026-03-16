"use client";

import { useRealtime } from "@/hooks/useRealtime";
import React from "react";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtime();
  return <>{children}</>;
}
