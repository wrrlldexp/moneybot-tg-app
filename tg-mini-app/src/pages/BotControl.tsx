import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getServerBotStatus, stopAllServerGrids } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { StatusBadge } from "@/components/StatusBadge";
import { useTelegram } from "@/hooks/useTelegram";
import { useState } from "react";
import { AlertTriangle, Power, RefreshCw } from "lucide-react";

export function BotControl() {
  const serverId = useServerStore((s) => s.activeServerId);
  const queryClient = useQueryClient();
  const { haptic } = useTelegram();
  const [confirm, setConfirm] = useState(false);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["bot-status", serverId],
    queryFn: () => getServerBotStatus(serverId!),
    enabled: !!serverId,
    refetchInterval: 5_000,
  });

  const stopMut = useMutation({
    mutationFn: () => stopAllServerGrids(serverId!),
    onSuccess: () => { haptic?.notificationOccurred("warning"); setConfirm(false); queryClient.invalidateQueries(); },
  });

  if (!serverId) return <p className="text-center py-16 text-tg-hint">Select a server</p>;
  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" /></div>;

  const uptime = status?.uptime_seconds ? `${Math.floor(status.uptime_seconds / 3600)}h ${Math.floor((status.uptime_seconds % 3600) / 60)}m` : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Bot Control</h1>
        <button onClick={() => refetch()} className="p-2 rounded-lg bg-white/5"><RefreshCw size={16} className="text-tg-hint" /></button>
      </div>
      <div className="rounded-xl bg-tg-secondary p-4 border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Power size={18} className={status?.worker_running ? "text-emerald-400" : "text-red-400"} /><span className="font-medium">Worker</span></div>
          <StatusBadge status={status?.worker_running ? "running" : "stopped"} />
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-tg-hint">Active Grids</span><span className="text-right font-medium">{status?.active_grids ?? 0}</span>
          <span className="text-tg-hint">Uptime</span><span className="text-right font-medium">{uptime}</span>
        </div>
      </div>
      {!confirm ? (
        <button onClick={() => { haptic?.impactOccurred("heavy"); setConfirm(true); }}
          className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-medium text-sm flex items-center justify-center gap-2">
          <AlertTriangle size={16} /> Emergency Stop All
        </button>
      ) : (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 space-y-3">
          <p className="text-sm text-red-400 font-medium text-center">Stop ALL running grids?</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirm(false)} className="flex-1 py-2.5 rounded-lg bg-white/5 text-sm font-medium">Cancel</button>
            <button onClick={() => stopMut.mutate()} disabled={stopMut.isPending} className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium disabled:opacity-50">
              {stopMut.isPending ? "Stopping..." : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
