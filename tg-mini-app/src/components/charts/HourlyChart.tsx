import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface HourlyDist { hour: number; trades: number; pnl: number }

export function HourlyChart({ data, height = 120 }: { data: HourlyDist[]; height?: number }) {
  if (!data?.length) return null;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="hour" tick={{ fontSize: 8, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(h) => `${h}:00`} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number, name: string) => [name === "pnl" ? v.toFixed(4) : v, name === "pnl" ? "PnL" : "Сделок"]}
            labelFormatter={(h) => `${h}:00`}
          />
          <Bar dataKey="trades" radius={[2, 2, 0, 0]} name="Сделок">
            {data.map((d, i) => (
              <Cell key={i} fill={d.pnl >= 0 ? "#34d399" : "#f87171"} fillOpacity={0.6} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
