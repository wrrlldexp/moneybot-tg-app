import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Grids = lazy(() => import("@/pages/Grids").then((m) => ({ default: m.Grids })));
const GridDetail = lazy(() => import("@/pages/GridDetail").then((m) => ({ default: m.GridDetail })));
const BotControl = lazy(() => import("@/pages/BotControl").then((m) => ({ default: m.BotControl })));
const Servers = lazy(() => import("@/pages/Servers").then((m) => ({ default: m.Servers })));
const Trades = lazy(() => import("@/pages/Trades").then((m) => ({ default: m.Trades })));
const Accounts = lazy(() => import("@/pages/Accounts").then((m) => ({ default: m.Accounts })));
const Logs = lazy(() => import("@/pages/Logs").then((m) => ({ default: m.Logs })));
const Analytics = lazy(() => import("@/pages/Analytics").then((m) => ({ default: m.Analytics })));
const SettingsPage = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.SettingsPage })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));

function PageLoader() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <div className="h-7 w-32 rounded-lg bg-tg-secondary animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-xl bg-tg-secondary animate-pulse" />
        <div className="h-20 rounded-xl bg-tg-secondary animate-pulse" />
      </div>
      <div className="h-32 rounded-xl bg-tg-secondary animate-pulse" />
      <div className="h-24 rounded-xl bg-tg-secondary animate-pulse" />
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isTelegram } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;
    const timer = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // В Telegram контексте ждём авторизацию
  if (isTelegram && !isAuthenticated) {
    if (timedOut) {
      return (
        <div className="flex items-center justify-center h-screen bg-tg-bg text-tg-text px-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-tg-hint">
              Не удалось авторизоваться. Проверьте соединение и попробуйте снова.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-tg-button text-tg-button-text text-sm font-medium"
            >
              Повторить
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-screen bg-tg-bg text-tg-text">
        <div className="text-center space-y-4">
          <div className="space-y-3">
            <div className="h-6 w-40 rounded-lg bg-tg-secondary animate-pulse mx-auto" />
            <div className="h-4 w-56 rounded bg-tg-secondary animate-pulse mx-auto" />
          </div>
          <div className="w-8 h-8 border-2 border-tg-button border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-tg-hint">Авторизация...</p>
        </div>
      </div>
    );
  }

  // Вне Telegram — показываем сообщение
  if (!isTelegram && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-tg-bg text-tg-text px-6 text-center">
        <div className="space-y-3">
          <p className="text-lg font-semibold">MoneyBot</p>
          <p className="text-sm text-tg-hint">Откройте приложение из Telegram.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthGate>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/grids" element={<Grids />} />
              <Route path="/grids/:id" element={<GridDetail />} />
              <Route path="/bot" element={<BotControl />} />
              <Route path="/servers" element={<Servers />} />
              <Route path="/trades" element={<Trades />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </AuthGate>
    </ErrorBoundary>
  );
}
