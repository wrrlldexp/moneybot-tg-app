import { useEffect, useMemo } from "react";
import { getTelegramWebApp } from "@/lib/telegram";

export function useTelegram() {
  const webApp = useMemo(() => getTelegramWebApp(), []);
  useEffect(() => { webApp?.ready(); webApp?.expand(); }, [webApp]);
  return {
    webApp,
    user: webApp?.initDataUnsafe?.user ?? null,
    initData: webApp?.initData ?? "",
    colorScheme: webApp?.colorScheme ?? "dark",
    platform: webApp?.platform ?? "unknown",
    haptic: webApp?.HapticFeedback ?? null,
    backButton: webApp?.BackButton ?? null,
  };
}
