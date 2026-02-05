"use client";

import { motion } from "framer-motion";
import type { MMState } from "@/lib/useMarketSimulation";

interface MMTableProps {
  mms: MMState[];
  isCrisis: boolean;
}

function tierBadgeClass(tier: string): string {
  switch (tier) {
    case "MARTYR": return "badge-martyr";
    case "CITIZEN": return "badge-citizen";
    case "SOVEREIGN": return "badge-sovereign";
    default: return "";
  }
}

export default function MMTable({ mms, isCrisis }: MMTableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Market Maker Status
        </h3>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          ({mms.filter(m => m.active).length}/{mms.length} active)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-center px-3 py-2 font-medium">Tier</th>
              <th className="text-center px-3 py-2 font-medium">Score</th>
              <th className="text-center px-3 py-2 font-medium">Status</th>
              <th className="text-right px-3 py-2 font-medium">Spread (bps)</th>
              <th className="text-right px-3 py-2 font-medium">Credibility</th>
              <th className="text-right px-3 py-2 font-medium">Reward</th>
              <th className="text-right px-4 py-2 font-medium">Slashed</th>
            </tr>
          </thead>
          <tbody>
            {mms.map((mm, i) => (
              <motion.tr
                key={mm.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: mm.active ? 1 : 0.4,
                  x: 0,
                }}
                transition={{ delay: i * 0.03 }}
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: !mm.active && isCrisis ? "rgba(239,68,68,0.03)" : "transparent",
                }}
              >
                <td className="px-4 py-2.5 font-medium font-mono" style={{ color: "var(--text-primary)" }}>
                  {mm.name}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tierBadgeClass(mm.tier)}`}>
                    {mm.tier}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center font-mono" style={{ color: "var(--text-secondary)" }}>
                  {mm.score.toFixed(0)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {mm.active ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(16,185,129,0.12)", color: "var(--accent-green)" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(239,68,68,0.12)", color: "var(--accent-red)" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      FLED
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  <span
                    style={{
                      color: mm.spreadBps > 200
                        ? "var(--accent-red)"
                        : mm.spreadBps > 80
                        ? "var(--accent-amber)"
                        : "var(--accent-green)",
                    }}
                  >
                    {mm.spreadBps.toFixed(0)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${mm.credibility * 100}%`,
                          background: mm.credibility > 0.80
                            ? "var(--accent-green)"
                            : mm.credibility > 0.50
                            ? "var(--accent-amber)"
                            : "var(--accent-red)",
                        }}
                      />
                    </div>
                    <span className="font-mono w-8 text-right" style={{ color: "var(--text-secondary)" }}>
                      {(mm.credibility * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono" style={{ color: "var(--accent-green)" }}>
                  {mm.icReward > 0 ? `+${mm.icReward.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-mono" style={{ color: mm.slashAmount > 0 ? "var(--accent-red)" : "var(--text-muted)" }}>
                  {mm.slashAmount > 0 ? `-${mm.slashAmount.toFixed(2)}` : "—"}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
