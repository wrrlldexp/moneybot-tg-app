import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Grid3X3, Bot, ArrowDownUp, BarChart3, Wallet, ScrollText, Server, Settings } from "lucide-react";
import { cn } from "./ui/cn";
import { useState } from "react";

const MAIN_NAV = [
  { path: "/", icon: LayoutDashboard, label: "Обзор" },
  { path: "/grids", icon: Grid3X3, label: "Сетки" },
  { path: "/analytics", icon: BarChart3, label: "Аналитика" },
  { path: "/bot", icon: Bot, label: "Бот" },
] as const;

const MORE_NAV = [
  { path: "/trades", icon: ArrowDownUp, label: "Сделки" },
  { path: "/accounts", icon: Wallet, label: "Аккаунты" },
  { path: "/logs", icon: ScrollText, label: "Журнал" },
  { path: "/servers", icon: Server, label: "Серверы" },
  { path: "/settings", icon: Settings, label: "Настройки" },
] as const;

function isActive(pathname: string, path: string) {
  return pathname === path || (path !== "/" && pathname.startsWith(path));
}

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = MORE_NAV.some(({ path }) => isActive(pathname, path));

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-16 left-0 right-0 bg-tg-secondary/95 backdrop-blur-lg border-t border-white/10 rounded-t-2xl shadow-2xl p-2 more-menu-enter"
            role="menu"
            aria-label="Дополнительные разделы"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-1">
              {MORE_NAV.map(({ path, icon: Icon, label }) => {
                const active = isActive(pathname, path);
                return (
                  <button
                    key={path}
                    role="menuitem"
                    onClick={() => { navigate(path); setShowMore(false); }}
                    className={cn(
                      "flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-colors",
                      active ? "text-tg-button bg-tg-button/10" : "text-tg-hint active:bg-white/5",
                    )}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 1.5} aria-hidden="true" />
                    <span className="text-[9px] font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-tg-secondary/80 backdrop-blur-lg border-t border-white/5 z-50"
        role="navigation"
        aria-label="Основная навигация"
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {MAIN_NAV.map(({ path, icon: Icon, label }) => {
            const active = isActive(pathname, path);
            return (
              <button
                key={path}
                onClick={() => { navigate(path); setShowMore(false); }}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors relative",
                  active ? "text-tg-button" : "text-tg-hint",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.5} aria-hidden="true" />
                <span className="text-[9px] font-medium">{label}</span>
                {/* Active indicator dot */}
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-tg-button" />
                )}
              </button>
            );
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            aria-expanded={showMore}
            aria-haspopup="menu"
            aria-label="Дополнительные разделы"
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors relative",
              isMoreActive || showMore ? "text-tg-button" : "text-tg-hint",
            )}
          >
            <div className="flex gap-0.5" aria-hidden="true">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
            <span className="text-[9px] font-medium mt-1">Ещё</span>
            {/* Active indicator for more menu items */}
            {isMoreActive && !showMore && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-tg-button" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
