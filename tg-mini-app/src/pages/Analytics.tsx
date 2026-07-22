import { useQuery } from "@tanstack/react-query";
import { getServerAnalytics } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { PnlChart } from "@/components/charts/PnlChart";
import { DailyActivityChart } from "@/components/charts/DailyActivityChart";
import { DrawdownChart } from "@/components/charts/DrawdownChart";
import { HourlyChart } from "@/components/charts/HourlyChart";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-tg-hint">{label}</span>
      <span className={`font-medium tabular-nums ${color ?? ""}`}>{value}</span>
    </div>
  );
}

function pnlColor(v: number) {
  return v > 0 ? "text-emerald-400" : v < 0 ? "text-red-400" : "";
}

export function Analytics() {
  const serverId = useServerStore((s) => s.activeServerId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", serverId],
    queryFn: () => getServerAnalytics(serverId!),
    enabled: !!serverId,
  });

  if (!serverId) return <p className="text-center py-16 text-tg-hint">Выберите сервер</p>;
  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" /></div>;
  if (error || !data) return <p className="text-center py-12 text-tg-hint">Не удалось загрузить аналитику</p>;

  const stats = data.period_stats ?? data.total_stats;
  const pnlSeries = (data.pnl_series ?? []).flatMap((s) => s.points ?? []);
  const gridComps = data.grid_comparison ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 size={20} className="text-tg-accent" />
        <h1 className="text-xl font-bold">Аналитика</h1>
      </div>

      {/* Period stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-tg-secondary p-3 border border-white/5">
            <p className="text-[10px] text-tg-hint mb-1">PnL сегодня</p>
            <p className={`text-lg font-bold tabular-nums ${pnlColor(stats.pnl_today)}`}>
              {stats.pnl_today >= 0 ? "+" : ""}{Number(stats.pnl_today).toFixed(4)}
            </p>
          </div>
          <div className="rounded-xl bg-tg-secondary p-3 border border-white/5">
            <p className="text-[10px] text-tg-hint mb-1">PnL за 24ч</p>
            <p className={`text-lg font-bold tabular-nums ${pnlColor(stats.pnl_24h)}`}>
              {stats.pnl_24h >= 0 ? "+" : ""}{Number(stats.pnl_24h).toFixed(4)}
            </p>
          </div>
          <div className="rounded-xl bg-tg-secondary p-3 border border-white/5">
            <p className="text-[10px] text-tg-hint mb-1">PnL за неделю</p>
            <p className={`text-lg font-bold tabular-nums ${pnlColor(stats.pnl_week)}`}>
              {stats.pnl_week >= 0 ? "+" : ""}{Number(stats.pnl_week).toFixed(4)}
            </p>
          </div>
          <div className="rounded-xl bg-tg-secondary p-3 border border-white/5">
            <p className="text-[10px] text-tg-hint mb-1">PnL за месяц</p>
            <p className={`text-lg font-bold tabular-nums ${pnlColor(stats.pnl_month)}`}>
              {stats.pnl_month >= 0 ? "+" : ""}{Number(stats.pnl_month).toFixed(4)}
            </p>
          </div>
        </div>
      )}

      {/* PnL Chart */}
      {pnlSeries.length > 0 && (
        <div className="rounded-xl bg-tg-secondary p-3 border border-white/5">
          <h2 className="text-sm font-semibold text-tg-hint mb-2">График PnL</h2>
          <PnlChart data={pnlSeries} height={180} />
        </div>
      )}

      {/* Daily Activity */}
      {data.daily_activity && data.daily_activity.length > 0 && (
        <div className="rounded-xl bg-tg-secondary p-3 border border-white/5">
          <h2 className="text-sm font-semibold text-tg-hint mb-2">Активность по дням</h2>
          <DailyActivityChart data={data.daily_activity} />
        </div>
      )}

      {/* Hourly Distribution */}
      {data.hourly_distribution && data.hourly_distribution.length > 0 && (
        <div className="rounded-xl bg-tg-secondary p-3 border border-white/5">
          <h2 className="text-sm font-semibold text-tg-hint mb-2">Распределение по часам</h2>
          <HourlyChart data={data.hourly_distribution} />
        </div>
      )}

      {/* Drawdown */}
      {data.drawdown_curve && data.drawdown_curve.length > 0 && (
        <div className="rounded-xl bg-tg-secondary p-3 border border-white/5">
          <h2 className="text-sm font-semibold text-tg-hint mb-2">Просадка</h2>
          <DrawdownChart data={data.drawdown_curve} />
        </div>
      )}

      {/* Detailed stats */}
      {stats && (
        <div className="rounded-xl bg-tg-secondary p-4 border border-white/5">
          <h2 className="text-sm font-semibold text-tg-hint mb-2">Детальная статистика</h2>
          <StatRow label="Win Rate" value={`${(stats.win_rate * 100).toFixed(1)}%`} color={pnlColor(stats.win_rate - 0.5)} />
          <StatRow label="Profit Factor" value={Number(stats.profit_factor).toFixed(2)} color={pnlColor(stats.profit_factor - 1)} />
          <StatRow label="Средний PnL/сделку" value={Number(stats.avg_trade_pnl).toFixed(6)} color={pnlColor(stats.avg_trade_pnl)} />
          <StatRow label="Лучшая сделка" value={`+${Number(stats.best_trade).toFixed(4)}`} color="text-emerald-400" />
          <StatRow label="Худшая сделка" value={Number(stats.worst_trade).toFixed(4)} color="text-red-400" />
          <StatRow label="Макс. просадка" value={Number(stats.max_drawdown).toFixed(4)} color="text-red-400" />
          <StatRow label="Общий объём" value={Number(stats.total_volume).toFixed(2)} />
          <StatRow label="Комиссии" value={Number(stats.total_commission).toFixed(4)} color="text-amber-400" />
          <StatRow label="Сделок сегодня" value={stats.trades_today} />
          <StatRow label="Сделок за неделю" value={stats.trades_week} />
          <StatRow label="Сделок за месяц" value={stats.trades_month} />
          <StatRow label="Раундов" value={stats.total_rounds} />
          <StatRow label="Макс. серия побед" value={stats.max_win_streak} color="text-emerald-400" />
          <StatRow label="Макс. серия убытков" value={stats.max_loss_streak} color="text-red-400" />
        </div>
      )}

      {/* Grid Comparison */}
      {gridComps.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-tg-hint mb-2">Сравнение сеток</h2>
          <div className="space-y-2">
            {gridComps.map((g) => (
              <div key={g.grid_id} className="rounded-xl bg-tg-secondary p-3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{g.grid_name}</p>
                    <p className="text-xs text-tg-hint">{g.symbol} · {g.strategy}</p>
                  </div>
                  <p className={`text-sm font-bold tabular-nums ${pnlColor(g.realized_pnl)}`}>
                    {g.realized_pnl >= 0 ? "+" : ""}{Number(g.realized_pnl).toFixed(4)}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-y-1 text-xs">
                  <span className="text-tg-hint">Win Rate</span>
                  <span className="text-tg-hint">PF</span>
                  <span className="text-tg-hint">PnL/ч</span>
                  <span className="font-medium">{(g.win_rate * 100).toFixed(0)}%</span>
                  <span className="font-medium">{Number(g.profit_factor).toFixed(2)}</span>
                  <span className={`font-medium ${pnlColor(g.pnl_per_hour)}`}>{Number(g.pnl_per_hour).toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Trades */}
      {data.recent_trades && data.recent_trades.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-tg-hint mb-2">Последние сделки</h2>
          <div className="space-y-1">
            {data.recent_trades.slice(0, 15).map((t, i) => (
              <div key={i} className="rounded-lg bg-tg-secondary px-3 py-2 border border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={t.side === "buy" ? "text-emerald-400" : "text-red-400"}>
                    {t.side === "buy" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  </span>
                  <span>{t.grid_name}</span>
                  <span className="text-tg-hint">{t.symbol}</span>
                </div>
                <span className={`font-medium tabular-nums ${pnlColor(t.pnl_delta ?? 0)}`}>
                  {(t.pnl_delta ?? 0) >= 0 ? "+" : ""}{Number(t.pnl_delta ?? 0).toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
