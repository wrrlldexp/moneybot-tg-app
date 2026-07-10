import { useQuery } from "@tanstack/react-query";
import { getServerDashboard } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { PnlCard } from "@/components/PnlCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Activity, TrendingUp, Zap } from "lucide-react";

export function Dashboard() {
  const serverId = useServerStore((s) => s.activeServerId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", serverId],
    queryFn: () => getServerDashboard(serverId!),
    enabled: !!serverId,
    refetchInterval: 15_000,
  });

  if (!serverId) return <NoServer />;
  if (isLoading) return <Spinner />;
  if (error || !data) return <p className="text-center py-12 text-tg-hint">Failed to load dashboard</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <StatusBadge status={data.active_grids > 0 ? "running" : "stopped"} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PnlCard label="Total PnL" value={data.total_pnl} />
        <PnlCard label="Win Rate" value={data.win_rate} suffix="%" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Zap, val: data.active_grids, label: "Active" },
          { icon: Activity, val: data.total_grids, label: "Total" },
          { icon: TrendingUp, val: data.total_trades, label: "Trades" },
        ].map(({ icon: I, val, label }) => (
          <div key={label} className="rounded-xl bg-tg-secondary p-3 border border-white/5 text-center">
            <I size={16} className="mx-auto mb-1 text-tg-accent" />
            <p className="text-lg font-semibold">{val}</p>
            <p className="text-[10px] text-tg-hint">{label}</p>
          </div>
        ))}
      </div>

      {data.positions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-tg-hint mb-2">Positions</h2>
          <div className="space-y-2">
            {data.positions.map((p) => (
              <div key={p.grid_id} className="rounded-xl bg-tg-secondary p-3 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{p.grid_name}</p>
                  <p className="text-xs text-tg-hint">{p.symbol} · {p.strategy}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold tabular-nums ${p.realized_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {p.realized_pnl >= 0 ? "+" : ""}{p.realized_pnl.toFixed(4)}
                  </p>
                  <StatusBadge status={p.status} className="mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NoServer() {
  return <div className="text-center py-16 text-tg-hint"><p>Add a trading server first</p></div>;
}

function Spinner() {
  return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" /></div>;
}
