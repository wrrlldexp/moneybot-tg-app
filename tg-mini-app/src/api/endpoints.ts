import { api } from "./client";

// --- Auth ---

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: { id: number; telegram_id: number; telegram_username: string | null; first_name: string; last_name: string | null; is_admin: boolean };
}

export const telegramLogin = (initData: string) =>
  api.post<LoginResponse>("/api/auth/login", { init_data: initData }).then((r) => r.data);

// --- Servers ---

export interface Server {
  id: number;
  name: string;
  url: string;
  is_active: boolean;
  is_default: boolean;
  last_status: string | null;
  last_ping_at: string | null;
  created_at: string;
}

export const getServers = () => api.get<Server[]>("/api/servers/").then((r) => r.data);

export const addServer = (data: { name: string; url: string; api_token?: string }) =>
  api.post<Server>("/api/servers/", data).then((r) => r.data);

export const updateServer = (id: number, data: Partial<{ name: string; url: string; api_token: string; is_default: boolean }>) =>
  api.patch<Server>(`/api/servers/${id}`, data).then((r) => r.data);

export const deleteServer = (id: number) => api.delete(`/api/servers/${id}`);

export const pingServer = (id: number) => api.post<{ status: string }>(`/api/servers/${id}/ping`).then((r) => r.data);

// --- Proxy to trading bot via server ---

export const getServerDashboard = (serverId: number) =>
  api.get<DashboardData>(`/api/servers/${serverId}/dashboard`).then((r) => r.data);

export const getServerGrids = (serverId: number) =>
  api.get<Grid[]>(`/api/servers/${serverId}/grids`).then((r) => r.data);

export const getServerGrid = (serverId: number, gridId: string) =>
  api.get<Grid>(`/api/servers/${serverId}/grids/${gridId}`).then((r) => r.data);

export const startServerGrid = (serverId: number, gridId: string) =>
  api.post<Grid>(`/api/servers/${serverId}/grids/${gridId}/start`).then((r) => r.data);

export const stopServerGrid = (serverId: number, gridId: string) =>
  api.post<Grid>(`/api/servers/${serverId}/grids/${gridId}/stop`).then((r) => r.data);

export const getServerBotStatus = (serverId: number) =>
  api.get<BotStatus>(`/api/servers/${serverId}/bot/status`).then((r) => r.data);

export const stopAllServerGrids = (serverId: number) =>
  api.post<{ stopped: number }>(`/api/servers/${serverId}/bot/stop-all`).then((r) => r.data);

// --- Types ---

export interface DashboardData {
  total_grids: number;
  active_grids: number;
  total_pnl: number;
  total_trades: number;
  win_rate: number;
  strategies: { strategy: string; grids_count: number; active_count: number; total_pnl: number; total_trades: number }[];
  positions: { grid_id: string; grid_name: string; symbol: string; strategy: string; status: string; mode: string; realized_pnl: number; total_trades: number }[];
  equity_curve: { date: string; value: number; label: string }[];
}

export interface Grid {
  id: string;
  name: string;
  symbol: string;
  mode: string;
  status: string;
  strategy: string;
  lot_size: string;
  profit_step: string;
  grid_step: string;
  levels_above: number;
  levels_below: number;
  total_trades: number;
  realized_pnl: string;
  created_at: string;
}

export interface BotStatus {
  worker_running: boolean;
  active_grids: number;
  uptime_seconds: number | null;
}
