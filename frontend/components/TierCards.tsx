"use client";

import { motion } from "framer-motion";
import { Shield, User, Zap } from "lucide-react";

interface TierInfo {
  name: string;
  count: number;
  avgSpread: number;
  avgCredibility: number;
  totalReward: number;
  totalSlash: number;
  active: number;
}

interface TierCardsProps {
  martyrs: TierInfo;
  citizens: TierInfo;
  sovereigns: TierInfo;
  isCrisis: boolean;
}

const TIER_CONFIG = {
  martyr: {
    label: "Martyrs",
    subtitle: "Crisis Providers — Rewarded",
    icon: Shield,
    badgeClass: "badge-martyr",
    color: "var(--tier-martyr)",
    desc: "Stay liquid during crisis. Earn IC rewards.",
  },
  citizen: {
    label: "Citizens",
    subtitle: "Moderate Providers",
    icon: User,
    badgeClass: "badge-citizen",
    color: "var(--tier-citizen)",
    desc: "Moderate spreads. Partial crisis participation.",
  },
  sovereign: {
    label: "Sovereigns",
    subtitle: "Self-Interested — Slashed",
    icon: Zap,
    badgeClass: "badge-sovereign",
    color: "var(--tier-sovereign)",
    desc: "Withdraw in crisis. Face slashing penalties.",
  },
};

function TierCard({
  tier,
  info,
  isCrisis,
}: {
  tier: "martyr" | "citizen" | "sovereign";
  info: TierInfo;
  isCrisis: boolean;
}) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  return (
    <motion.div
      className="card p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: tier === "martyr" ? 0 : tier === "citizen" ? 0.1 : 0.2 }}
      style={
        isCrisis && tier === "martyr"
          ? { borderColor: config.color, boxShadow: `0 0 15px color-mix(in srgb, ${config.color} 20%, transparent)` }
          : isCrisis && tier === "sovereign"
          ? { borderColor: "var(--accent-red)", opacity: 0.7 }
          : {}
      }
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: config.color }} />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badgeClass}`}>
            {config.label}
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          {info.active}/{info.count} active
        </span>
      </div>

      <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
        {config.desc}
      </p>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span style={{ color: "var(--text-muted)" }}>Avg Spread</span>
          <span className="font-mono font-semibold" style={{ color: config.color }}>
            {info.avgSpread.toFixed(1)} bps
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: "var(--text-muted)" }}>Avg Credibility</span>
          <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
            {info.avgCredibility.toFixed(1)}%
          </span>
        </div>

        {/* Credibility bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: config.color }}
            animate={{ width: `${info.avgCredibility}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="flex justify-between text-xs pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Reward: </span>
            <span className="font-mono" style={{ color: "var(--accent-green)" }}>
              +{info.totalReward.toFixed(2)}
            </span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Slashed: </span>
            <span className="font-mono" style={{ color: "var(--accent-red)" }}>
              -{info.totalSlash.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TierCards({ martyrs, citizens, sovereigns, isCrisis }: TierCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <TierCard tier="martyr" info={martyrs} isCrisis={isCrisis} />
      <TierCard tier="citizen" info={citizens} isCrisis={isCrisis} />
      <TierCard tier="sovereign" info={sovereigns} isCrisis={isCrisis} />
    </div>
  );
}
