import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Grid3X3, Bot, Settings, Server } from "lucide-react";
import { cn } from "./ui/cn";

const NAV = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/grids", icon: Grid3X3, label: "Grids" },
  { path: "/bot", icon: Bot, label: "Bot" },
  { path: "/servers", icon: Server, label: "Servers" },
  { path: "/settings", icon: Settings, label: "Settings" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-tg-secondary border-t border-white/5">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <button key={path} onClick={() => navigate(path)}
              className={cn("flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors", active ? "text-tg-button" : "text-tg-hint")}>
              <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
