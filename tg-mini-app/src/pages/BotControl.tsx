import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getServerBotStatus, stopAllServerGrids, emergencyStop, restartBot } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { StatusBadge } from "@/components/StatusBadge";
import { useTelegram } from "@/hooks/useTelegram";
import { useState } from "react";
import { AlertTriangle, Power, RefreshCw, RotateCcw } from "lucide-react";

export function BotControl() {
  const serverId = useServerStore((s) => s.activeServerId);
  const queryClient = useQueryClient();
  const { haptic } = useTelegram();
  const [confirm, setConfirm] = useState<"stop" | "emergency" | null>(null);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["bot-status", serverId],
    queryFn: () => getServerBotStatus(serverId!),
    enabled: !!serverId,
    refetchInterval: 5_000,
  });

  const stopMut = useMutation({
    mutationFn: () => stopAllServerGrids(serverId!),
    onSuccess: () => { haptic?.notificationOccurred("warning"); setConfirm(null); queryClient.invalidateQueries(); },
  });

  const emergencyMut = useMutation({
    mutationFn: () => emergencyStop(serverId!),
    onSuccess: () => { haptic?.notificationOccurred("error"); setConfirm(null); queryClient.invalidateQueries(); },
  });

  const restartMut = useMutation({
    mutationFn: () => restartBot(serverId!),
    onSuccess: () => { haptic?.notificationOccurred("success"); queryClient.invalidateQueries(); },
  });

  if (!serverId) return <p className="text-center py-16 text-tg-hint">Выберите сервер</p>;
  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-7 w-32 rounded-lg bg-tg-secondary animate-pulse" />
      <div className="h-28 rounded-xl bg-tg-secondary animate-pulse" />
      <div className="h-12 rounded-xl bg-tg-secondary animate-pulse" />
      <div className="h-12 rounded-xl bg-tg-secondary animate-pulse" />
    </div>
  );
  if (!status) return (
    <div className="text-center py-16 space-y-4">
      <p className="text-sm text-tg-hint">Не удалось загрузить статус бота</p>
      <button onClick={() => refetch()} className="px-5 py-2 rounded-xl bg-tg-button text-tg-button-text text-sm font-medium">Повторить</button>
    </div>
  );

  const uptime = status?.uptime_seconds ? `${Math.floor(status.uptime_seconds / 3600)}ч ${Math.floor((status.uptime_seconds % 3600) / 60)}м` : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Управление</h1>
        <button onClick={() => refetch()} className="p-2 rounded-lg bg-white/5"><RefreshCw size={16} className="text-tg-hint" /></button>
      </div>
      <div className="rounded-xl bg-tg-secondary p-4 border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Power size={18} className={status?.worker_running ? "text-emerald-400" : "text-red-400"} /><span className="font-medium">Воркер</span></div>
          <StatusBadge status={status?.worker_running ? "running" : "stopped"} />
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-tg-hint">Активных сеток</span><span className="text-right font-medium">{status?.active_grids ?? 0}</span>
          <span className="text-tg-hint">Аптайм</span><span className="text-right font-medium">{uptime}</span>
        </div>
      </div>

      <button onClick={() => restartMut.mutate()} disabled={restartMut.isPending}
        className="w-full py-3 rounded-xl bg-tg-button/10 text-tg-button border border-tg-button/20 font-medium text-sm flex items-center justify-center gap-2">
        <RotateCcw size={16} /> {restartMut.isPending ? "Перезапуск..." : "Перезапустить бота"}
      </button>

      {!confirm ? (
        <div className="space-y-2">
          <button onClick={() => { haptic?.impactOccurred("heavy"); setConfirm("stop"); }}
            className="w-full py-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium text-sm flex items-center justify-center gap-2">
            <Power size={16} /> Остановить все сетки
          </button>
          <button onClick={() => { haptic?.impactOccurred("heavy"); setConfirm("emergency"); }}
            className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-medium text-sm flex items-center justify-center gap-2">
            <AlertTriangle size={16} /> Экстренная остановка
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 space-y-3">
          <p className="text-sm text-red-400 font-medium text-center">
            {confirm === "emergency" ? "Экстренная остановка? Все позиции будут закрыты!" : "Остановить ВСЕ запущенные сетки?"}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirm(null)} className="flex-1 py-2.5 rounded-lg bg-white/5 text-sm font-medium">Отмена</button>
            <button onClick={() => confirm === "emergency" ? emergencyMut.mutate() : stopMut.mutate()}
              disabled={stopMut.isPending || emergencyMut.isPending}
              className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium disabled:opacity-50">
              {(stopMut.isPending || emergencyMut.isPending) ? "Остановка..." : "Подтвердить"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
