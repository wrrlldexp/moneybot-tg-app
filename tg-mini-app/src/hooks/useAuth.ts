import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { telegramLogin } from "@/api/endpoints";
import { getInitData, isTelegramContext } from "@/lib/telegram";

export function useAuth() {
  const { isAuthenticated, setAuth, logout } = useAuthStore();
  const attempted = useRef(false);

  useEffect(() => {
    if (isAuthenticated || attempted.current) return;
    attempted.current = true;
    const initData = getInitData();
    if (!initData) {
      console.warn("[auth] No initData available");
      return;
    }
    console.log("[auth] Attempting login...");
    telegramLogin(initData)
      .then((res) => {
        console.log("[auth] Login success");
        setAuth(res.access_token, res.refresh_token, res.user);
      })
      .catch((err) => {
        console.error("[auth] Login failed:", err?.response?.status, err?.response?.data || err.message);
        // Don't call logout — just leave isAuthenticated=false
        // attempted stays true so we don't retry infinitely
        // User can click "Повторить" which reloads the page
      });
  }, [isAuthenticated, setAuth, logout]);

  return { isAuthenticated, isTelegram: isTelegramContext(), user: useAuthStore((s) => s.user) };
}
