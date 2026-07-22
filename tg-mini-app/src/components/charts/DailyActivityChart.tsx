import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

interface DailyActivity { date: string; trades: number; buys: number; sells: number }

export function DailyActivityChart({ data, height = 140 }: { data: DailyActivity[]; height?: number }) {
  if (!data?.length) return null;

  const formatted = data.map((d) => ({ ...d, date: d.date.slice(5, 10) }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#888" }}
          />
          <Bar dataKey="buys" stackId="a" fill="#34d399" radius={[2, 2, 0, 0]} name="Покупки" />
          <Bar dataKey="sells" stackId="a" fill="#f87171" radius={[2, 2, 0, 0]} name="Продажи" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
