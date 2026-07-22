import { useQuery } from "@tanstack/react-query";
import { getAuditLog, getLogs } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { useState } from "react";
import { ScrollText, Shield } from "lucide-react";

type Tab = "logs" | "audit";

export function Logs() {
  const serverId = useServerStore((s) => s.activeServerId);
  const [tab, setTab] = useState<Tab>("logs");

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["logs", serverId],
    queryFn: () => getLogs(serverId!, { limit: 50 }),
    enabled: !!serverId && tab === "logs",
  });

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["audit", serverId],
    queryFn: () => getAuditLog(serverId!, { limit: 50 }),
    enabled: !!serverId && tab === "audit",
  });

  if (!serverId) return <p className="text-center py-16 text-tg-hint">Выберите сервер</p>;

  const isLoading = tab === "logs" ? logsLoading : auditLoading;
  const items = tab === "logs"
    ? (Array.isArray(logs) ? logs : logs?.items ?? [])
    : (Array.isArray(audit) ? audit : audit?.items ?? []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Журнал</h1>

      <div className="flex gap-2">
        <button onClick={() => setTab("logs")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "logs" ? "bg-tg-button text-tg-button-text" : "bg-white/5 text-tg-hint"}`}>
          <ScrollText size={14} /> Логи
        </button>
        <button onClick={() => setTab("audit")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "audit" ? "bg-tg-button text-tg-button-text" : "bg-white/5 text-tg-hint"}`}>
          <Shield size={14} /> Аудит
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" /></div>
      ) : !items.length ? (
        <p className="text-center py-12 text-tg-hint">Нет записей</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item: any, i: number) => (
            <div key={item.id ?? i} className="rounded-xl bg-tg-secondary px-3 py-2.5 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  item.level === "error" || item.action?.includes("error") ? "bg-red-500/15 text-red-400" :
                  item.level === "warning" ? "bg-amber-500/15 text-amber-400" :
                  "bg-white/5 text-tg-hint"
                }`}>
                  {item.level?.toUpperCase() ?? item.action ?? "INFO"}
                </span>
                <span className="text-[10px] text-tg-hint">
                  {item.created_at ? new Date(item.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
              <p className="text-xs text-tg-text leading-relaxed">{item.message ?? item.details ?? JSON.stringify(item)}</p>
              {item.user_email && <p className="text-[10px] text-tg-hint mt-1">{item.user_email}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
