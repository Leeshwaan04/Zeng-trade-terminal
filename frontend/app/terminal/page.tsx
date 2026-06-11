import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import { TerminalErrorBoundary } from "@/components/layout/TerminalErrorBoundary";

export default function Home() {
  return (
    <main className="h-full w-full">
      <Suspense fallback={<div className="h-full w-full bg-[#080a0c] flex items-center justify-center text-primary font-mono text-xs tracking-widest uppercase">Initializing ZenG Trade...</div>}>
        {/* Top-level boundary: widget boundaries exist, but a crash in the
            shell/login layer previously white-screened the whole page. */}
        <TerminalErrorBoundary name="Terminal">
          <AppShell />
        </TerminalErrorBoundary>
      </Suspense>
    </main>
  );
}
