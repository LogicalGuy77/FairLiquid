"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingDown, TrendingUp, Users, Activity } from "lucide-react";
import type { TickData } from "@/lib/useMarketSimulation";

interface ComparisonPanelProps {
  history: TickData[];
  tradLiquidity: number;
  tradSpreadBps: number;
  tradActiveMMs: number;
  lexLiquidity: number;
  lexSpreadBps: number;
  lexActiveMMs: number;
  isCrisis: boolean;
}

function StatCard({
  label,
  value,
  unit,
  color,
  icon: Icon,
  isGood,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  icon: React.ElementType;
  isGood?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
      <div
        className="p-2 rounded-md"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold font-mono stat-value" style={{ color }}>
            {value}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonPanel({
  history, tradLiquidity, tradSpreadBps, tradActiveMMs,
  lexLiquidity, lexSpreadBps, lexActiveMMs, isCrisis,
}: ComparisonPanelProps) {
  const chartData = history.slice(-30).map((h) => ({
    tick: h.tick,
    tradSpread: Math.round(h.tradSpreadBps),
    lexSpread: Math.round(h.lexSpreadBps),
    tradLiq: Math.round(h.tradLiquidity),
    lexLiq: Math.round(h.lexLiquidity),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Traditional AMM */}
      <motion.div
        className={`card p-4 ${isCrisis ? "card-crisis" : ""}`}
        animate={isCrisis ? { scale: [1, 1.002, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full" style={{ background: "var(--accent-red)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--accent-red)" }}>
            Traditional AMM
          </h3>
          {isCrisis && (
            <span className="crisis-pulse text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "var(--accent-red)" }}>
              LIQUIDITY CRISIS
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard
            label="Liquidity"
            value={tradLiquidity.toFixed(0)}
            unit="%"
            color={tradLiquidity < 30 ? "var(--accent-red)" : "var(--accent-green)"}
            icon={TrendingDown}
          />
          <StatCard
            label="Spread"
            value={tradSpreadBps.toFixed(0)}
            unit="bps"
            color={tradSpreadBps > 100 ? "var(--accent-red)" : "var(--accent-green)"}
            icon={Activity}
          />
          <StatCard
            label="Active MMs"
            value={tradActiveMMs.toFixed(0)}
            unit="/8"
            color={tradActiveMMs < 4 ? "var(--accent-red)" : "var(--accent-green)"}
            icon={Users}
          />
        </div>

        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tick" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "11px",
                color: "var(--text-primary)",
              }}
            />
            <Line type="monotone" dataKey="tradSpread" stroke="var(--accent-red)" strokeWidth={2} dot={false} name="Spread (bps)" isAnimationActive={false} />
            <Line type="monotone" dataKey="tradLiq" stroke="var(--accent-amber)" strokeWidth={1.5} dot={false} name="Liquidity (%)" isAnimationActive={false} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* LEX JUSTICIA */}
      <motion.div
        className={`card p-4 ${isCrisis ? "glow-green" : ""}`}
        style={isCrisis ? { borderColor: "var(--accent-green)" } : {}}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full" style={{ background: "var(--accent-green)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--accent-green)" }}>
            LEX JUSTICIA (Myersonian)
          </h3>
          {isCrisis && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "var(--accent-green)" }}>
              CRISIS CONTAINED
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard
            label="Liquidity"
            value={lexLiquidity.toFixed(0)}
            unit="%"
            color="var(--accent-green)"
            icon={TrendingUp}
          />
          <StatCard
            label="Spread"
            value={lexSpreadBps.toFixed(0)}
            unit="bps"
            color={lexSpreadBps > 100 ? "var(--accent-amber)" : "var(--accent-green)"}
            icon={Activity}
          />
          <StatCard
            label="Active MMs"
            value={lexActiveMMs.toFixed(0)}
            unit="/8"
            color="var(--accent-green)"
            icon={Users}
          />
        </div>

        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tick" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "11px",
                color: "var(--text-primary)",
              }}
            />
            <Line type="monotone" dataKey="lexSpread" stroke="var(--accent-green)" strokeWidth={2} dot={false} name="Spread (bps)" isAnimationActive={false} />
            <Line type="monotone" dataKey="lexLiq" stroke="var(--accent-cyan)" strokeWidth={1.5} dot={false} name="Liquidity (%)" isAnimationActive={false} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
