import { api } from "./client";

// --- Auth ---

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: { id: number; telegram_id: number; telegram_username: string | null; first_name: string; last_name: string | null; is_admin: boolean };
}

export const telegramLogin = (initData: string): Promise<LoginResponse> =>
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

export const getServers = (): Promise<Server[]> => api.get<Server[]>("/api/servers/").then((r) => r.data);

export const addServer = (data: { name: string; url: string; email: string; password: string }): Promise<Server> =>
  api.post<Server>("/api/servers/", data).then((r) => r.data);

export const updateServer = (id: number, data: Partial<{ name: string; url: string; email: string; password: string; is_default: boolean }>): Promise<Server> =>
  api.patch<Server>(`/api/servers/${id}`, data).then((r) => r.data);

export const deleteServer = (id: number): Promise<void> => api.delete(`/api/servers/${id}`).then(() => undefined);
export const pingServer = (id: number): Promise<{ status: string }> => api.post<{ status: string }>(`/api/servers/${id}/ping`).then((r) => r.data);

// --- Dashboard ---

export const getServerDashboard = (serverId: number): Promise<DashboardData> =>
  api.get<DashboardData>(`/api/servers/${serverId}/dashboard`).then((r) => r.data);

export interface PeriodStats {
  pnl_today: number;
  pnl_24h: number;
  pnl_week: number;
  pnl_month: number;
  win_rate: number;
  profit_factor: number;
  avg_trade_pnl: number;
  best_trade: number;
  worst_trade: number;
  max_drawdown: number;
  total_volume: number;
  total_commission: number;
  trades_today: number;
  trades_week: number;
  trades_month: number;
  total_rounds: number;
  max_win_streak: number;
  max_loss_streak: number;
}

export interface GridComparison {
  grid_id: string;
  grid_name: string;
  symbol: string;
  strategy: string;
  realized_pnl: number;
  win_rate: number;
  profit_factor: number;
  pnl_per_hour: number;
}

export interface RecentTrade {
  grid_name: string;
  symbol: string;
  side: string;
  pnl_delta: number | null;
}

export interface ServerAnalytics {
  period_stats?: PeriodStats;
  total_stats?: PeriodStats;
  pnl_series?: { points: { date: string; value: number; label: string }[] }[];
  grid_comparison?: GridComparison[];
  daily_activity?: { date: string; trades: number; pnl: number }[];
  hourly_distribution?: { hour: number; trades: number; pnl: number }[];
  drawdown_curve?: { date: string; value: number }[];
  recent_trades?: RecentTrade[];
}

export const getServerAnalytics = (serverId: number): Promise<ServerAnalytics> =>
  api.get<ServerAnalytics>(`/api/servers/${serverId}/dashboard/analytics`).then((r) => r.data);

// --- Grids ---

export const getServerGrids = (serverId: number): Promise<Grid[]> =>
  api.get<Grid[]>(`/api/servers/${serverId}/grids`).then((r) => r.data);

export const getServerGrid = (serverId: number, gridId: string): Promise<Grid> =>
  api.get<Grid>(`/api/servers/${serverId}/grids/${gridId}`).then((r) => r.data);

export interface GridActionResponse {
  status: string;
  message?: string;
}

export const startServerGrid = (serverId: number, gridId: string): Promise<GridActionResponse> =>
  api.post<GridActionResponse>(`/api/servers/${serverId}/grids/${gridId}/start`).then((r) => r.data);

export const stopServerGrid = (serverId: number, gridId: string): Promise<GridActionResponse> =>
  api.post<GridActionResponse>(`/api/servers/${serverId}/grids/${gridId}/stop`).then((r) => r.data);

export interface GridEvent {
  id: string;
  type: string;
  message: string;
  created_at: string;
}

export const getGridEvents = (serverId: number, gridId: string): Promise<GridEvent[]> =>
  api.get<GridEvent[]>(`/api/servers/${serverId}/grids/${gridId}/events`).then((r) => r.data);

export interface GridOrder {
  id: string;
  side: string;
  price: string;
  quantity: string;
  status: string;
  filled_at: string | null;
}

export const getGridOrders = (serverId: number, gridId: string): Promise<GridOrder[]> =>
  api.get<GridOrder[]>(`/api/servers/${serverId}/grids/${gridId}/orders`).then((r) => r.data);

export interface AnalyticsSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  pnl: number;
  trades_count: number;
}

export const getGridAnalyticsSessions = (serverId: number, gridId: string): Promise<AnalyticsSession[]> =>
  api.get<AnalyticsSession[]>(`/api/servers/${serverId}/grids/${gridId}/analytics-sessions`).then((r) => r.data);

export interface GridConfig {
  name: string;
  symbol: string;
  mode: string;
  strategy: string;
  lot_size: string;
  profit_step: string;
  grid_step: string;
  levels_above: number;
  levels_below: number;
  [key: string]: string | number | boolean;
}

export const createGrid = (serverId: number, data: GridConfig): Promise<Grid> =>
  api.post<Grid>(`/api/servers/${serverId}/grids`, data).then((r) => r.data);

export const updateGrid = (serverId: number, gridId: string, data: Partial<GridConfig>): Promise<Grid> =>
  api.put<Grid>(`/api/servers/${serverId}/grids/${gridId}`, data).then((r) => r.data);

export const deleteGrid = (serverId: number, gridId: string): Promise<void> =>
  api.delete(`/api/servers/${serverId}/grids/${gridId}`).then(() => undefined);

// --- Bot ---

export const getServerBotStatus = (serverId: number): Promise<BotStatus> =>
  api.get<BotStatus>(`/api/servers/${serverId}/bot/status`).then((r) => r.data);

export const stopAllServerGrids = (serverId: number): Promise<GridActionResponse> =>
  api.post<GridActionResponse>(`/api/servers/${serverId}/bot/stop-all`).then((r) => r.data);

export const emergencyStop = (serverId: number): Promise<GridActionResponse> =>
  api.post<GridActionResponse>(`/api/servers/${serverId}/bot/emergency-stop`).then((r) => r.data);

export const restartBot = (serverId: number): Promise<GridActionResponse> =>
  api.post<GridActionResponse>(`/api/servers/${serverId}/bot/restart`).then((r) => r.data);

export interface HealthCheckResponse {
  status: string;
  uptime_seconds: number;
  memory_usage_mb: number;
}

export const botHealthCheck = (serverId: number): Promise<HealthCheckResponse> =>
  api.get<HealthCheckResponse>(`/api/servers/${serverId}/bot/health-check`).then((r) => r.data);

// --- Accounts ---

export interface Account {
  id: string;
  name: string;
  exchange: string;
  is_active: boolean;
  created_at: string;
}

export interface AccountBalance {
  asset: string;
  free: string;
  locked: string;
  total: string;
}

export const getAccounts = (serverId: number): Promise<Account[]> =>
  api.get<Account[]>(`/api/servers/${serverId}/accounts`).then((r) => r.data);

export const getAccountBalances = (serverId: number): Promise<AccountBalance[]> =>
  api.get<AccountBalance[]>(`/api/servers/${serverId}/accounts/balances`).then((r) => r.data);

export const testAccount = (serverId: number, accountId: string): Promise<{ status: string }> =>
  api.post<{ status: string }>(`/api/servers/${serverId}/accounts/${accountId}/test`).then((r) => r.data);

// --- Trades ---

export interface TradeRecord {
  id: string;
  grid_id: string;
  grid_name: string;
  symbol: string;
  side: string;
  price: string;
  quantity: string;
  pnl: number;
  fee: string;
  executed_at: string;
}

export interface TradesResponse {
  items: TradeRecord[];
  total: number;
}

export const getTrades = (serverId: number, params?: { limit?: number; offset?: number; grid_id?: string }): Promise<TradesResponse> =>
  api.get<TradesResponse>(`/api/servers/${serverId}/trades`, { params }).then((r) => r.data);

// --- Market ---

export interface MarketTicker {
  symbol: string;
  price: string;
  change_24h: string;
  volume_24h: string;
}

export const getMarketTicker = (serverId: number, symbol: string): Promise<MarketTicker> =>
  api.get<MarketTicker>(`/api/servers/${serverId}/market/ticker`, { params: { symbol } }).then((r) => r.data);

// --- Audit & Logs ---

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  source: string;
  created_at: string;
}

export interface LogsResponse {
  items: LogEntry[];
  total: number;
}

export const getAuditLog = (serverId: number, params?: { limit?: number; offset?: number }): Promise<LogsResponse> =>
  api.get<LogsResponse>(`/api/servers/${serverId}/audit`, { params }).then((r) => r.data);

export const getLogs = (serverId: number, params?: { limit?: number; offset?: number }): Promise<LogsResponse> =>
  api.get<LogsResponse>(`/api/servers/${serverId}/logs`, { params }).then((r) => r.data);

// --- Users ---

export interface ServerUser {
  id: number;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string;
  role: string;
}

export const getServerUsers = (serverId: number): Promise<ServerUser[]> =>
  api.get<ServerUser[]>(`/api/servers/${serverId}/users`).then((r) => r.data);

// --- Types ---

export interface DashboardData {
  total_grids: number;
  active_grids: number;
  total_pnl: number;
  total_trades: number;
  win_rate: number;
  strategies: { strategy: string; grids_count: number; active_count: number; total_pnl: number; total_trades: number }[];
  positions: { grid_id: string; grid_name: string; symbol: string; strategy: string; status: string; mode: string; realized_pnl: number; total_trades: number; side?: string; current_levels?: number; filled_orders?: number }[];
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
