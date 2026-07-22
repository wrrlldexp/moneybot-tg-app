import { useQuery } from "@tanstack/react-query";
import { getTrades } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { useState } from "react";
import { ArrowDownUp } from "lucide-react";

export function Trades() {
  const serverId = useServerStore((s) => s.activeServerId);
  const [page, setPage] = useState(0);
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["trades", serverId, page],
    queryFn: () => getTrades(serverId!, { limit, offset: page * limit }),
    enabled: !!serverId,
  });

  if (!serverId) return <p className="text-center py-16 text-tg-hint">Выберите сервер</p>;
  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" /></div>;

  const trades = Array.isArray(data) ? data : data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ArrowDownUp size={20} className="text-tg-accent" />
        <h1 className="text-xl font-bold">Сделки</h1>
      </div>

      {!trades.length ? (
        <p className="text-center py-12 text-tg-hint">Нет сделок</p>
      ) : (
        <div className="space-y-1.5">
          {trades.map((t: any, i: number) => (
            <div key={t.id ?? i} className="rounded-xl bg-tg-secondary px-3 py-2.5 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${t.side === "buy" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {t.side === "buy" ? "ПОКУПКА" : "ПРОДАЖА"}
                  </span>
                  <span className="text-sm font-medium">{t.symbol}</span>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${(t.pnl ?? t.realized_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(t.pnl ?? t.realized_pnl ?? 0) >= 0 ? "+" : ""}{Number(t.pnl ?? t.realized_pnl ?? 0).toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-tg-hint">
                <span>Цена: {t.price} · Кол-во: {t.amount ?? t.quantity}</span>
                <span>{t.created_at ? new Date(t.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pt-2">
        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
          className="px-4 py-2 rounded-lg bg-white/5 text-sm disabled:opacity-30">← Назад</button>
        <span className="text-xs text-tg-hint">Стр. {page + 1}</span>
        <button onClick={() => setPage(page + 1)} disabled={trades.length < limit}
          className="px-4 py-2 rounded-lg bg-white/5 text-sm disabled:opacity-30">Далее →</button>
      </div>
    </div>
  );
}
