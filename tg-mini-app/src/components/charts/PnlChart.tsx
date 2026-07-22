import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface Point { date?: string; timestamp?: string; cumulative_pnl?: number; value?: number }

export function PnlChart({ data, height = 160 }: { data: Point[]; height?: number }) {
  if (!data?.length) return null;

  const formatted = data.map((p) => ({
    date: (p.date ?? p.timestamp ?? "").slice(5, 10),
    value: p.cumulative_pnl ?? p.value ?? 0,
  }));

  const isPositive = (formatted[formatted.length - 1]?.value ?? 0) >= 0;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "#34d399" : "#f87171"} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? "#34d399" : "#f87171"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#888" }}
            formatter={(v: number) => [v.toFixed(4), "PnL"]}
          />
          <Area type="monotone" dataKey="value" stroke={isPositive ? "#34d399" : "#f87171"} fill="url(#pnlGrad)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
