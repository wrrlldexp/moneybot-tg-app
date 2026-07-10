import { useQuery } from "@tanstack/react-query";
import { getServers } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { useEffect } from "react";
import { cn } from "./ui/cn";
import { ChevronDown, Circle } from "lucide-react";
import { useState } from "react";

export function ServerSelector() {
  const { activeServerId, setActiveServer } = useServerStore();
  const [open, setOpen] = useState(false);

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: getServers,
    refetchInterval: 30_000,
  });

  // Auto-select default server
  useEffect(() => {
    if (!activeServerId && servers?.length) {
      const def = servers.find((s) => s.is_default) ?? servers[0];
      if (def) setActiveServer(def.id);
    }
  }, [activeServerId, servers, setActiveServer]);

  const active = servers?.find((s) => s.id === activeServerId);

  if (!servers?.length) return null;

  return (
    <div className="relative px-4 pt-3 pb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-tg-secondary border border-white/5 text-sm"
      >
        <Circle
          size={8}
          className={cn(
            "fill-current",
            active?.last_status === "ok" ? "text-emerald-400" : "text-red-400",
          )}
        />
        <span className="flex-1 text-left font-medium truncate">
          {active?.name ?? "Select server"}
        </span>
        <ChevronDown size={14} className={cn("text-tg-hint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-4 right-4 top-full mt-1 bg-tg-secondary border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
          {servers.map((s) => (
            <button
              key={s.id}
              onClick={() => { setActiveServer(s.id); setOpen(false); }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left transition-colors",
                s.id === activeServerId ? "bg-tg-button/10 text-tg-button" : "hover:bg-white/5",
              )}
            >
              <Circle
                size={6}
                className={cn("fill-current", s.last_status === "ok" ? "text-emerald-400" : "text-zinc-500")}
              />
              <span className="flex-1 truncate">{s.name}</span>
              {s.is_default && <span className="text-[10px] text-tg-hint">default</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
