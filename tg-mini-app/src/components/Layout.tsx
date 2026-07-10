import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { ServerSelector } from "./ServerSelector";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-tg-bg text-tg-text">
      <ServerSelector />
      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
