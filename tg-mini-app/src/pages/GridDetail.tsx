import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getServerGrid, startServerGrid, stopServerGrid, getGridOrders, getGridEvents, updateGrid, deleteGrid } from "@/api/endpoints";
import { useServerStore } from "@/stores/serverStore";
import { StatusBadge } from "@/components/ui/Badge";
import { PnlCard } from "@/components/PnlCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PnlChart } from "@/components/charts/PnlChart";
import { useTelegram } from "@/hooks/useTelegram";
import { useEffect, useState } from "react";
import { ArrowLeft, Play, Square, Settings, Trash2, Save } from "lucide-react";

const TABS = [
  { key: "info", label: "Инфо" },
  { key: "orders", label: "Ордера" },
  { key: "events", label: "События" },
  { key: "settings", label: "Настройки" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function GridDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const serverId = useServerStore((s) => s.activeServerId);
  const { haptic, backButton } = useTelegram();
  const [tab, setTab] = useState<Tab>("info");
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const { data: orders } = useQuery({
    queryKey: ["grid-orders", serverId, id],
    queryFn: () => getGridOrders(serverId!, id!),
    enabled: !!serverId && !!id && tab === "orders",
  });

  const { data: events } = useQuery({
    queryKey: ["grid-events", serverId, id],
    queryFn: () => getGridEvents(serverId!, id!),
    enabled: !!serverId && !!id && tab === "events",
  });

  const startMut = useMutation({
    mutationFn: () => startServerGrid(serverId!, id!),
    onSuccess: () => { haptic?.notificationOccurred("success"); queryClient.invalidateQueries({ queryKey: ["grid", serverId, id] }); },
  });
  const stopMut = useMutation({
    mutationFn: () => stopServerGrid(serverId!, id!),
    onSuccess: () => { haptic?.notificationOccurred("warning"); queryClient.invalidateQueries({ queryKey: ["grid", serverId, id] }); },
  });
  const updateMut = useMutation({
    mutationFn: (data: Record<string, any>) => updateGrid(serverId!, id!, data),
    onSuccess: () => { haptic?.notificationOccurred("success"); queryClient.invalidateQueries({ queryKey: ["grid", serverId, id] }); },
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteGrid(serverId!, id!),
    onSuccess: () => { haptic?.notificationOccurred("warning"); navigate("/grids"); },
  });

  useEffect(() => {
    if (grid && tab === "settings" && !Object.keys(editForm).length) {
      setEditForm({
        lot_size: grid.lot_size ?? "",
        grid_step: grid.grid_step ?? "",
        profit_step: grid.profit_step ?? "",
        levels_above: String(grid.levels_above ?? ""),
        levels_below: String(grid.levels_below ?? ""),
      });
    }
  }, [grid, tab]);

  if (isLoading || !grid) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const running = grid.status === "running";
  const pnlSeries = (grid as any).pnl_series ?? (grid as any).analytics?.pnl_series;

  return (
    <div className="space-y-4 stagger-enter">
      {/* Back button */}
      <button onClick={() => navigate("/grids")} className="flex items-center gap-1 text-tg-hint text-sm active:opacity-70 transition-opacity">
        <ArrowLeft size={16} /> Назад
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{grid.name}</h1>
          <p className="text-sm text-tg-hint">{grid.symbol}</p>
        </div>
        <StatusBadge status={grid.status} />
      </div>

      {/* Start/Stop button */}
      <Button
        onClick={() => running ? stopMut.mutate() : startMut.mutate()}
        loading={startMut.isPending || stopMut.isPending}
        variant={running ? "danger" : "primary"}
        size="lg"
        className={running
          ? "!bg-red-500/15 !text-red-400 !border-red-500/20"
          : "!bg-emerald-500/15 !text-emerald-400 !border-emerald-500/20"
        }
      >
        {running ? <><Square size={16} /> Остановить</> : <><Play size={16} /> Запустить</>}
      </Button>

      {/* PnL cards */}
      <div className="grid grid-cols-2 gap-3">
        <PnlCard label="Реализ. PnL" value={Number(grid.realized_pnl)} />
        <PnlCard label="Сделок" value={grid.total_trades} />
      </div>

      {/* PnL chart */}
      {pnlSeries?.length > 0 && (
        <Card title="График PnL" className="!p-3">
          <PnlChart data={pnlSeries} height={140} />
        </Card>
      )}

      {/* Segmented control tabs */}
      <div className="segmented-control w-full">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-active={tab === t.key}
            className="flex-1 text-center"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content with transition */}
      <div key={tab} className="tab-content">
        {tab === "info" && <InfoTab grid={grid} />}
        {tab === "orders" && <OrdersTab orders={orders} />}
        {tab === "events" && <EventsTab events={events} />}
        {tab === "settings" && (
          <SettingsTab
            editForm={editForm}
            setEditForm={setEditForm}
            grid={grid}
            updateMut={updateMut}
            deleteMut={deleteMut}
            confirmDelete={confirmDelete}
            setConfirmDelete={setConfirmDelete}
          />
        )}
      </div>
    </div>
  );
}

function InfoTab({ grid }: { grid: any }) {
  const rows = [
    ["Стратегия", grid.strategy],
    ["Режим", grid.mode],
    ["Лот", grid.lot_size],
    ["Лот (quote)", grid.lot_quote],
    ["Шаг сетки", grid.grid_step],
    ["Шаг профита", grid.profit_step],
    ["Уровни вверх", grid.levels_above],
    ["Уровни вниз", grid.levels_below],
    ["Ребилд (сек)", grid.rebuild_timeout_sec],
    ["Аккаунт", grid.account_id?.slice(0, 8) + "..."],
  ].filter(([, v]) => v != null && v !== "null" && v !== "undefined");

  return (
    <Card>
      <h2 className="text-sm font-semibold text-tg-hint mb-3">Конфигурация</h2>
      <div className="space-y-2">
        {rows.map(([l, v]) => (
          <div key={l as string} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
            <span className="text-sm text-tg-hint">{l}</span>
            <span className="text-sm font-medium tabular-nums">{String(v)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OrdersTab({ orders }: { orders: any }) {
  if (!orders || (Array.isArray(orders) && !orders.length)) {
    return <p className="text-xs text-tg-hint text-center py-8">Нет ордеров</p>;
  }

  return (
    <div className="space-y-1.5">
      {/* Table header */}
      <div className="flex items-center px-3 py-1.5 text-[10px] text-tg-hint font-medium uppercase tracking-wider">
        <span className="w-8">#</span>
        <span className="w-12">Сторона</span>
        <span className="flex-1 tabular-nums">Цена</span>
        <span className="w-16 text-right">Статус</span>
      </div>
      {(Array.isArray(orders) ? orders : []).slice(0, 30).map((o: any, i: number) => (
        <div key={i} className="rounded-lg bg-tg-secondary px-3 py-2 border border-white/5 flex items-center text-xs">
          <span className="w-8 text-tg-hint tabular-nums">{o.grid_index ?? i}</span>
          <span className={`w-12 font-medium ${o.side === "buy" ? "text-emerald-400" : "text-red-400"}`}>
            {o.side?.toUpperCase()}
          </span>
          <div className="flex-1 flex items-center gap-2">
            <span className="tabular-nums">{o.price}</span>
            {o.price_sell && <span className="text-tg-hint">/ {o.price_sell}</span>}
            {o.profit && <span className="text-emerald-400 tabular-nums font-medium">+{o.profit}</span>}
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            o.status === "filled" ? "bg-emerald-500/15 text-emerald-400" :
            o.status === "open" ? "bg-blue-500/15 text-blue-400" :
            "bg-white/5 text-tg-hint"
          }`}>
            {o.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function EventsTab({ events }: { events: any }) {
  if (!events || (Array.isArray(events) && !events.length)) {
    return <p className="text-xs text-tg-hint text-center py-8">Нет событий</p>;
  }

  return (
    <div className="space-y-1.5">
      {(Array.isArray(events) ? events : []).slice(0, 30).map((e: any, i: number) => (
        <div key={i} className="rounded-lg bg-tg-secondary px-3 py-2.5 border border-white/5 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className={`font-semibold ${
              e.event_type?.includes("sell") ? "text-red-400" :
              e.event_type?.includes("buy") ? "text-emerald-400" :
              "text-tg-hint"
            }`}>
              {e.event_type}
            </span>
            <span className="text-tg-hint text-[10px] tabular-nums">
              {e.created_at ? new Date(e.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 text-tg-hint">
            {e.price && <span>Цена: <span className="text-tg-text tabular-nums">{e.price}</span></span>}
            {e.amount && <span>Кол-во: <span className="text-tg-text tabular-nums">{e.amount}</span></span>}
            {e.pnl_delta != null && (
              <span className={`font-medium ${e.pnl_delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                PnL: {e.pnl_delta >= 0 ? "+" : ""}{Number(e.pnl_delta).toFixed(4)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab({
  editForm, setEditForm, grid, updateMut, deleteMut, confirmDelete, setConfirmDelete,
}: {
  editForm: Record<string, string>;
  setEditForm: (f: Record<string, string>) => void;
  grid: any;
  updateMut: any;
  deleteMut: any;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
}) {
  const fields = [
    { key: "lot_size", label: "Размер лота" },
    { key: "grid_step", label: "Шаг сетки" },
    { key: "profit_step", label: "Шаг профита" },
    { key: "levels_above", label: "Уровней вверх" },
    { key: "levels_below", label: "Уровней вниз" },
  ];

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Settings size={14} className="text-tg-accent" />
          <span className="text-sm font-semibold">Параметры</span>
        </div>
        <div className="space-y-3">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-tg-hint">{label}</label>
              <input
                value={editForm[key] ?? ""}
                onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:border-tg-button tabular-nums mt-1 transition-colors"
              />
            </div>
          ))}
        </div>
        <Button
          onClick={() => {
            const payload: Record<string, any> = {};
            for (const [k, v] of Object.entries(editForm)) {
              if (v !== "" && v !== String(grid[k] ?? "")) {
                payload[k] = ["levels_above", "levels_below"].includes(k) ? Number(v) : v;
              }
            }
            if (Object.keys(payload).length) updateMut.mutate(payload);
          }}
          loading={updateMut.isPending}
          size="lg"
          className="mt-4"
        >
          <Save size={14} /> Сохранить
        </Button>
      </Card>

      {!confirmDelete ? (
        <Button
          variant="danger"
          size="lg"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 size={14} /> Удалить сетку
        </Button>
      ) : (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 space-y-3 tab-content">
          <p className="text-sm text-red-400 font-medium text-center">Удалить сетку безвозвратно?</p>
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" onClick={() => setConfirmDelete(false)} className="flex-1">
              Отмена
            </Button>
            <Button variant="danger" size="lg" onClick={() => deleteMut.mutate()} loading={deleteMut.isPending} className="flex-1 !bg-red-500 !text-white">
              Удалить
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
