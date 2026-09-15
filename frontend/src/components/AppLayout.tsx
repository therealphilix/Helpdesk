import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen desk-surface">
      <div className="accent-strip fixed left-0 top-0 z-50 w-full" />
      <Sidebar />
      <main className="pl-56">
        <div className="mx-auto max-w-[1160px] p-8 pt-10">
          {children}
        </div>
      </main>
    </div>
  );
}
