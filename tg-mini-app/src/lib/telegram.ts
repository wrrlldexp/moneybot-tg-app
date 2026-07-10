export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string; username?: string }; auth_date: number; hash: string };
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: { text: string; show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void; showProgress: () => void; hideProgress: () => void };
  BackButton: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
  HapticFeedback: { impactOccurred: (s: "light" | "medium" | "heavy" | "rigid" | "soft") => void; notificationOccurred: (t: "error" | "success" | "warning") => void; selectionChanged: () => void };
  colorScheme: "light" | "dark";
  platform: string;
}

declare global { interface Window { Telegram?: { WebApp: TelegramWebApp } } }

export const getTelegramWebApp = () => window.Telegram?.WebApp ?? null;
export const getInitData = () => window.Telegram?.WebApp?.initData ?? "";
export const isTelegramContext = () => !!window.Telegram?.WebApp?.initData;
