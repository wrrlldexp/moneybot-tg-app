import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getServerGrid, startServerGrid, stopServerGrid } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { StatusBadge } from "@/components/StatusBadge";
import { PnlCard } from "@/components/PnlCard";
import { useTelegram } from "@/hooks/useTelegram";
import { useEffect } from "react";
import { ArrowLeft, Play, Square } from "lucide-react";

export function GridDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const serverId = useServerStore((s) => s.activeServerId);
  const { haptic, backButton } = useTelegram();

  useEffect(() => {
    backButton?.show();
    const h = () => navigate("/grids");
    backButton?.onClick(h);
    return () => { backButton?.offClick(h); backButton?.hide(); };
  }, [backButton, navigate]);

  const { data: grid, isLoading } = useQuery({
    queryKey: ["grid", serverId, id],
    queryFn: () => getServerGrid(serverId!, id!),
    enabled: !!serverId && !!id,
    refetchInterval: 10_000,
  });

  const startMut = useMutation({
    mutationFn: () => startServerGrid(serverId!, id!),
    onSuccess: () => { haptic?.notificationOccurred("success"); queryClient.invalidateQueries({ queryKey: ["grid", serverId, id] }); },
  });
  const stopMut = useMutation({
    mutationFn: () => stopServerGrid(serverId!, id!),
    onSuccess: () => { haptic?.notificationOccurred("warning"); queryClient.invalidateQueries({ queryKey: ["grid", serverId, id] }); },
  });

  if (isLoading || !grid) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" /></div>;

  const running = grid.status === "running";

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/grids")} className="flex items-center gap-1 text-tg-hint text-sm"><ArrowLeft size={16} /> Back</button>
      <div className="flex items-start justify-between">
        <div><h1 className="text-xl font-bold">{grid.name}</h1><p className="text-sm text-tg-hint">{grid.symbol}</p></div>
        <StatusBadge status={grid.status} />
      </div>
      <button onClick={() => running ? stopMut.mutate() : startMut.mutate()} disabled={startMut.isPending || stopMut.isPending}
        className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors border ${running ? "bg-red-500/15 text-red-400 border-red-500/20" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"}`}>
        {running ? <><Square size={16} /> Stop Grid</> : <><Play size={16} /> Start Grid</>}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <PnlCard label="Realized PnL" value={Number(grid.realized_pnl)} />
        <PnlCard label="Total Trades" value={grid.total_trades} />
      </div>
      <div className="rounded-xl bg-tg-secondary p-4 border border-white/5 space-y-3">
        <h2 className="text-sm font-semibold text-tg-hint">Configuration</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          {[["Strategy", grid.strategy], ["Mode", grid.mode], ["Lot Size", grid.lot_size], ["Grid Step", grid.grid_step], ["Profit Step", grid.profit_step], ["Levels", `${grid.levels_above}↑ ${grid.levels_below}↓`]].map(([l, v]) => (
            <><span key={l} className="text-tg-hint">{l}</span><span className="text-right font-medium tabular-nums">{v}</span></>
          ))}
        </div>
      </div>
    </div>
  );
}
