import { useAuthStore } from "@/stores/authStore";
import { useTelegram } from "@/hooks/useTelegram";
import { User, Bell, Shield } from "lucide-react";

export function SettingsPage() {
  const { user } = useAuthStore();
  const { platform, colorScheme } = useTelegram();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Настройки</h1>

      <div className="rounded-xl bg-tg-secondary p-4 border border-white/5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-tg-button/20 flex items-center justify-center"><User size={20} className="text-tg-button" /></div>
          <div>
            <p className="font-medium text-sm">{user?.first_name} {user?.last_name ?? ""}</p>
            <p className="text-xs text-tg-hint">@{user?.telegram_username ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-tg-secondary p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3"><Bell size={16} className="text-tg-accent" /><span className="font-medium text-sm">Уведомления</span></div>
        <div className="space-y-3">
          {["Уведомления о сделках", "Оповещения об ошибках", "Смена статуса сетки", "Ежедневная сводка"].map((label, i) => (
            <label key={label} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">{label}</span>
              <input type="checkbox" defaultChecked={i < 3}
                className="w-9 h-5 appearance-none bg-white/10 rounded-full relative cursor-pointer transition-colors checked:bg-tg-button before:content-[''] before:absolute before:w-4 before:h-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-4" />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-tg-secondary p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3"><Shield size={16} className="text-tg-accent" /><span className="font-medium text-sm">Приложение</span></div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-tg-hint">Платформа</span><span className="text-right font-medium">{platform}</span>
          <span className="text-tg-hint">Тема</span><span className="text-right font-medium">{colorScheme}</span>
          <span className="text-tg-hint">Версия</span><span className="text-right font-medium">2.0.0</span>
        </div>
      </div>
    </div>
  );
}
