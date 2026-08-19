import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/**
 * PriceChart
 * -----------------------------------------------------------------------
 * Turns the market's trade history into a "probability over time" line
 * chart. Each trade already stores priceAfter (the price of whichever
 * side was traded, right after that trade), so we normalize everything
 * to Yes's price and hand it to recharts. We prepend a synthetic "Start"
 * point at 50% so the chart always shows where the market began.
 * -----------------------------------------------------------------------
 */
export function PriceChart({ trades }) {
  const normalizedPoints = [
    { label: "Start", yesPct: 50 },
    ...trades.map((t) => ({
      label: new Date(t.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      yesPct:
        Math.round(
          (t.side === "yes" ? t.priceAfter : 1 - t.priceAfter) * 1000
        ) / 10,
    })),
  ];

  if (trades.length === 0) {
    return (
      <div className="empty-state">
        No trades yet — this market is still at its starting price.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={normalizedPoints}
        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid
          stroke="var(--color-border)"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          stroke="var(--color-text-faint)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          stroke="var(--color-text-faint)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${value}%`, "Yes probability"]}
        />
        <Line
          type="monotone"
          dataKey="yesPct"
          stroke="var(--color-yes)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-yes)" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
