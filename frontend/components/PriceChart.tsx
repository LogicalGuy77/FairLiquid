"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import type { TickData } from "@/lib/useMarketSimulation";

interface PriceChartProps {
  history: TickData[];
  currentPrice: number;
}

export default function PriceChart({ history, currentPrice }: PriceChartProps) {
  const data = history.map((h) => ({
    tick: h.tick,
    price: Number(h.price.toFixed(3)),
    isCrisis: h.isCrisis,
  }));

  // Find crisis zone boundaries
  const crisisStart = history.find((h) => h.isCrisis)?.tick;
  const crisisEnd = [...history].reverse().find((h) => h.isCrisis)?.tick;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          SUI/USDC Price
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold font-mono" style={{ color: "var(--text-primary)" }}>
            ${currentPrice.toFixed(3)}
          </span>
          {history.length > 1 && (
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{
                color: currentPrice >= 4 ? "var(--accent-green)" : "var(--accent-red)",
                background: currentPrice >= 4
                  ? "rgba(16,185,129,0.15)"
                  : "rgba(239,68,68,0.15)",
              }}
            >
              {((currentPrice / 4 - 1) * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="tick" tick={{ fontSize: 10 }} />
          <YAxis domain={[2, 4.5]} tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "var(--text-primary)",
            }}
            formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(3)}`, "Price"]}
            labelFormatter={(label: unknown) => `Tick ${label}`}
          />
          {crisisStart !== undefined && crisisEnd !== undefined && (
            <ReferenceArea
              x1={crisisStart}
              x2={crisisEnd}
              fill="var(--accent-red)"
              fillOpacity={0.08}
              stroke="var(--accent-red)"
              strokeOpacity={0.2}
              strokeDasharray="4 4"
            />
          )}
          <ReferenceLine
            y={4.0}
            stroke="var(--text-muted)"
            strokeDasharray="3 3"
            strokeOpacity={0.4}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--accent-cyan)"
            strokeWidth={2}
            fill="url(#priceGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
