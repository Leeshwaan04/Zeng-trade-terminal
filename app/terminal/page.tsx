import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";

export default function Home() {
  return (
    <main className="h-full w-full">
      <Suspense fallback={<div className="h-full w-full bg-[#080a0c] flex items-center justify-center text-primary font-mono text-xs tracking-widest uppercase">Initializing ZenG Trade...</div>}>
        <AppShell />
      </Suspense>
    </main>
  );
}
