import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface DrawdownPoint { date: string; drawdown: number; peak: number }

export function DrawdownChart({ data, height = 120 }: { data: DrawdownPoint[]; height?: number }) {
  if (!data?.length) return null;

  const formatted = data.map((d) => ({ date: d.date.slice(5, 10), drawdown: d.drawdown }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis hide domain={["auto", 0]} />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number) => [`${v.toFixed(4)}`, "Просадка"]}
          />
          <Area type="monotone" dataKey="drawdown" stroke="#f87171" fill="url(#ddGrad)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
