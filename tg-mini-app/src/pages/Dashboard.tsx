import { useQuery } from "@tanstack/react-query";
import { getServerDashboard } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { PnlChart } from "@/components/charts/PnlChart";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Activity, TrendingUp, TrendingDown, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const serverId = useServerStore((s) => s.activeServerId);
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard", serverId],
    queryFn: () => getServerDashboard(serverId!),
    enabled: !!serverId,
    refetchInterval: 15_000,
  });

  if (!serverId) return <NoServer />;
  if (isLoading) return <LoadingSkeleton />;
  if (error || !data) return <ErrorState onRetry={() => refetch()} />;

  const pnlPositive = data.total_pnl >= 0;

  return (
    <div className="space-y-4 stagger-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Обзор</h1>
        <StatusBadge status={data.active_grids > 0 ? "running" : "stopped"} />
      </div>

      {/* Main PnL display */}
      <Card className="relative overflow-hidden">
        <p className="text-xs text-tg-hint mb-1">Общий PnL</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-3xl font-bold tabular-nums tracking-tight ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
            {pnlPositive ? "+" : ""}{data.total_pnl.toFixed(4)}
          </p>
          {pnlPositive ? (
            <ArrowUpRight size={20} className="text-emerald-400" />
          ) : (
            <ArrowDownRight size={20} className="text-red-400" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-tg-hint">Win Rate</span>
          <span className={`text-sm font-semibold tabular-nums ${data.win_rate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
            {data.win_rate.toFixed(1)}%
          </span>
        </div>
        {/* Subtle glow effect */}
        <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-10 ${pnlPositive ? "bg-emerald-400" : "bg-red-400"}`} />
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Zap, val: data.active_grids, label: "Активных", color: "text-emerald-400" },
          { icon: Activity, val: data.total_grids, label: "Всего", color: "text-tg-accent" },
          { icon: TrendingUp, val: data.total_trades, label: "Сделок", color: "text-blue-400" },
        ].map(({ icon: I, val, label, color }) => (
          <Card key={label} className="text-center !p-3">
            <I size={16} className={`mx-auto mb-1.5 ${color}`} />
            <p className="text-lg font-bold tabular-nums">{val}</p>
            <p className="text-[10px] text-tg-hint mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Equity Curve */}
      {data.equity_curve?.length > 0 && (
        <Card title="Кривая капитала" className="!p-3">
          <PnlChart data={data.equity_curve} height={160} />
        </Card>
      )}

      {/* Strategy breakdown */}
      {data.strategies?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-tg-hint mb-2">По стратегиям</h2>
          <div className="space-y-2">
            {data.strategies.map((s) => {
              const fillPct = s.grids_count > 0 ? (s.active_count / s.grids_count) * 100 : 0;
              return (
                <Card key={s.strategy} className="!p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{s.strategy}</p>
                      <Badge variant={s.active_count > 0 ? "success" : "neutral"} pulse={s.active_count > 0}>
                        {s.active_count}/{s.grids_count}
                      </Badge>
                    </div>
                    <p className={`text-sm font-bold tabular-nums ${s.total_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {s.total_pnl >= 0 ? "+" : ""}{s.total_pnl.toFixed(4)}
                    </p>
                  </div>
                  {/* Grid fill progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-tg-button transition-all duration-500"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-tg-hint tabular-nums">{s.total_trades} сделок</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Positions */}
      {data.positions?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-tg-hint mb-2">Позиции</h2>
          <div className="space-y-2">
            {data.positions.map((p) => {
              const fillPct = (p.current_levels ?? 0) > 0 ? ((p.filled_orders ?? 0) / (p.current_levels ?? 1)) * 100 : 0;
              return (
                <Card
                  key={p.grid_id}
                  onClick={() => navigate(`/grids/${p.grid_id}`)}
                  className="!p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm truncate">{p.grid_name}</p>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="text-xs text-tg-hint">{p.symbol} · {p.strategy} · {p.side}</p>
                      {/* Fill progress */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-tg-accent transition-all duration-500"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-tg-hint tabular-nums">
                          {p.filled_orders}/{p.current_levels}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="flex items-center gap-1 justify-end">
                        {p.realized_pnl >= 0 ? (
                          <TrendingUp size={14} className="text-emerald-400" />
                        ) : (
                          <TrendingDown size={14} className="text-red-400" />
                        )}
                        <p className={`text-sm font-bold tabular-nums ${p.realized_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {p.realized_pnl >= 0 ? "+" : ""}{p.realized_pnl.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NoServer() {
  return (
    <div className="text-center py-16 text-tg-hint">
      <p>Сначала добавьте торговый сервер</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-16 space-y-4">
      <p className="text-sm text-tg-hint">Не удалось загрузить данные</p>
      <Button onClick={onRetry} size="md">
        Повторить
      </Button>
    </div>
  );
}
