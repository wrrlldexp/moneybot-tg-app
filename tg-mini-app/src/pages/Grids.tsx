import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getServerGrids, startServerGrid, stopServerGrid } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { StatusBadge } from "@/components/StatusBadge";
import { useNavigate } from "react-router-dom";
import { useTelegram } from "@/hooks/useTelegram";
import { Play, Square } from "lucide-react";

export function Grids() {
  const serverId = useServerStore((s) => s.activeServerId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const { data: grids, isLoading, error, refetch } = useQuery({
    queryKey: ["grids", serverId],
    queryFn: () => getServerGrids(serverId!),
    enabled: !!serverId,
    refetchInterval: 10_000,
  });

  const startMut = useMutation({
    mutationFn: (gridId: string) => startServerGrid(serverId!, gridId),
    onSuccess: () => { haptic?.notificationOccurred("success"); queryClient.invalidateQueries({ queryKey: ["grids", serverId] }); },
  });

  const stopMut = useMutation({
    mutationFn: (gridId: string) => stopServerGrid(serverId!, gridId),
    onSuccess: () => { haptic?.notificationOccurred("warning"); queryClient.invalidateQueries({ queryKey: ["grids", serverId] }); },
  });

  if (!serverId) return <p className="text-center py-16 text-tg-hint">Выберите сервер</p>;
  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-7 w-24 rounded-lg bg-tg-secondary animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-xl bg-tg-secondary animate-pulse" />
      ))}
    </div>
  );
  if (error) return (
    <div className="text-center py-16 space-y-4">
      <p className="text-sm text-tg-hint">Не удалось загрузить сетки</p>
      <button onClick={() => refetch()} className="px-5 py-2 rounded-xl bg-tg-button text-tg-button-text text-sm font-medium">Повторить</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Сетки</h1>
      {!grids?.length ? (
        <p className="text-center py-12 text-tg-hint">Нет сеток</p>
      ) : (
        <div className="space-y-2">
          {grids.map((g) => (
            <div key={g.id} onClick={() => navigate(`/grids/${g.id}`)}
              className="rounded-xl bg-tg-secondary p-3 border border-white/5 active:bg-white/5 transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{g.name}</p>
                  <p className="text-xs text-tg-hint">{g.symbol} · {g.strategy}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={g.status} />
                  <button onClick={(e) => { e.stopPropagation(); haptic?.impactOccurred("medium"); g.status === "running" ? stopMut.mutate(g.id) : startMut.mutate(g.id); }}
                    className="p-1.5 rounded-lg bg-white/5 active:bg-white/10">
                    {g.status === "running" ? <Square size={14} className="text-red-400" /> : <Play size={14} className="text-emerald-400" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-tg-hint">{g.mode} · {g.levels_above + g.levels_below} уровней</span>
                <span className={`font-semibold tabular-nums ${Number(g.realized_pnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {Number(g.realized_pnl) >= 0 ? "+" : ""}{Number(g.realized_pnl).toFixed(4)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
