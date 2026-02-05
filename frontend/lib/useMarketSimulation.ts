"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  buildDistribution,
  computeOptimalTierBoundaries,
  calculateOptimalCrisisSpread,
  applySpreadConstraint,
  calculateICReward,
  calculateSlashingAmount,
  updateMMCredibility,
  upperVirtualValue,
  type PerformanceDistribution,
  type OptimalTierBoundaries,
} from "@/lib/engine/myersonian";

// ============================================================================
// TYPES
// ============================================================================

export type SimPhase =
  | "IDLE"
  | "NORMAL"
  | "CRASH_BEGINS"
  | "CRISIS_PEAK"
  | "RECOVERY"
  | "POST_MORTEM";

export interface MMState {
  id: string;
  name: string;
  tier: "MARTYR" | "CITIZEN" | "SOVEREIGN";
  score: number;
  active: boolean;
  spreadBps: number;
  credibility: number;
  icReward: number;
  slashed: boolean;
  slashAmount: number;
  stakeAmount: number;
}

export interface TickData {
  tick: number;
  price: number;
  volatilityBps: number;
  // Traditional AMM
  tradLiquidity: number;
  tradSpreadBps: number;
  tradActiveMMs: number;
  // LEX JUSTICIA
  lexLiquidity: number;
  lexSpreadBps: number;
  lexActiveMMs: number;
  // Phase
  phase: SimPhase;
  isCrisis: boolean;
}

export interface SimulationState {
  phase: SimPhase;
  tick: number;
  maxTick: number;
  isRunning: boolean;
  speed: number; // ms per tick
  history: TickData[];
  mms: MMState[];
  distribution: PerformanceDistribution;
  boundaries: OptimalTierBoundaries;
  commentary: string;
  events: SimEvent[];
  currentPrice: number;
  currentVolBps: number;
  isCrisis: boolean;
  // Aggregate stats
  tradLiquidity: number;
  tradSpreadBps: number;
  tradActiveMMs: number;
  lexLiquidity: number;
  lexSpreadBps: number;
  lexActiveMMs: number;
}

export interface SimEvent {
  tick: number;
  type: "INFO" | "CRISIS" | "SLASH" | "REWARD" | "WARNING";
  message: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INITIAL_PRICE = 4.0; // $4 SUI token
const NORMAL_VOL_BPS = 150; // 1.5% normal
const MAX_TICK = 60;
const TOTAL_MMS = 8;

const PHASE_TICKS = {
  NORMAL: [0, 15],
  CRASH_BEGINS: [16, 25],
  CRISIS_PEAK: [26, 40],
  RECOVERY: [41, 52],
  POST_MORTEM: [53, 60],
} as const;

const COMMENTARY: Record<SimPhase, string[]> = {
  IDLE: [
    "Welcome to the LEX JUSTICIA. Press Play to begin the demonstration. You'll witness how Myersonian mechanism design transforms market-making during a crisis.",
  ],
  NORMAL: [
    "📊 Normal market conditions. All 8 market makers are actively providing liquidity. Spreads are tight at ~5 bps. Both Traditional AMM and LEX JUSTICIA pools look identical — the magic happens during stress.",
    "🔍 Behind the scenes, LEX JUSTICIA has already classified MMs into Martyrs (committed crisis providers), Citizens (moderate), and Sovereigns (opportunistic) using virtual value scoring from Theorem 3.2.",
    "⚙️ The Myersonian scoring engine computed optimal tier boundaries: Martyrs must score ≥95% uptime commitment, Sovereigns ≤78%. The 17% gap in between is the 'no-trade zone' — the cost of information asymmetry.",
  ],
  CRASH_BEGINS: [
    "⚠️ FLASH CRASH DETECTED! Price dropping rapidly. Volatility spiking past 3000 bps threshold. Crisis oracle triggered!",
    "🔴 Traditional AMM: Market makers begin withdrawing liquidity. This is the classic 'liquidity vampire' problem — MMs flee exactly when traders need them most.",
    "🟢 LEX JUSTICIA: Crisis mode activated. Martyrs are CONTRACTUALLY BOUND to maintain liquidity. Their spreads are capped at 40 bps by the Myersonian mechanism. The smart router now prioritizes Martyr orders.",
  ],
  CRISIS_PEAK: [
    "🚨 CRISIS PEAK — This is where the systems diverge dramatically.",
    "🔴 Traditional AMM: Only 1-2 MMs remain. Spreads have exploded to 500+ bps. Liquidity has drained to under 20%. Traders face massive slippage and potential losses.",
    "🟢 LEX JUSTICIA: All 3 Martyrs are still providing liquidity at ≤40 bps spreads. Citizens remain at moderate capacity (≤100 bps). Liquidity stays above 70%. The Incentive-Compatible reward formula ensures honest Martyrs earn maximum rewards: R(σ) = ∫ φ_u(s) ds.",
    "💡 KEY INSIGHT: The no-trade gap prevents MMs from gaming the system. A Sovereign cannot pretend to be a Martyr — they'd be caught in the virtual value gap and slashed.",
  ],
  RECOVERY: [
    "📈 Market stabilizing. Price beginning to recover. Volatility dropping below crisis thresholds.",
    "🔴 Traditional AMM: MMs slowly return, but the damage is done. Traders who needed liquidity during the crash were left stranded. No accountability.",
    "🟢 LEX JUSTICIA: Slashing engine activating. Checking which MMs kept their commitments via ZK-proof verification. Sovereigns who fled face no penalty (they made no promise). But any Martyr who broke commitment gets slashed proportionally: slash = φ_u(claimed) − φ_u(actual).",
    "✅ Honest Martyrs receiving IC rewards from the penalty pool. The mechanism is self-enforcing — rewards for virtue, penalties for vice.",
  ],
  POST_MORTEM: [
    "📋 POST-MORTEM ANALYSIS — The final comparison tells the story:",
    "🔴 Traditional AMM suffered: 80%+ liquidity drain, 500+ bps spreads, massive trader losses, zero MM accountability.",
    "🟢 LEX JUSTICIA maintained: 70%+ liquidity throughout, ≤40 bps Martyr spreads, minimal trader slippage, full MM accountability through Myersonian incentive compatibility.",
    "🏆 This is the power of mechanism design applied to DeFi. Not just rules — mathematically optimal, incentive-compatible, welfare-maximizing rules. Lex Justicia: Law with Justice.",
  ],
};

// ============================================================================
// INITIAL MM SETUP
// ============================================================================

function createInitialMMs(): MMState[] {
  return [
    { id: "mm1", name: "AlphaVault", tier: "MARTYR", score: 97, active: true, spreadBps: 5, credibility: 0.95, icReward: 0, slashed: false, slashAmount: 0, stakeAmount: 50000 },
    { id: "mm2", name: "CrisisGuard", tier: "MARTYR", score: 96, active: true, spreadBps: 5, credibility: 0.93, icReward: 0, slashed: false, slashAmount: 0, stakeAmount: 45000 },
    { id: "mm3", name: "SteadyFlow", tier: "MARTYR", score: 95, active: true, spreadBps: 5, credibility: 0.91, icReward: 0, slashed: false, slashAmount: 0, stakeAmount: 40000 },
    { id: "mm4", name: "FairTrade", tier: "CITIZEN", score: 88, active: true, spreadBps: 5, credibility: 0.80, icReward: 0, slashed: false, slashAmount: 0, stakeAmount: 20000 },
    { id: "mm5", name: "MidPool", tier: "CITIZEN", score: 85, active: true, spreadBps: 5, credibility: 0.78, icReward: 0, slashed: false, slashAmount: 0, stakeAmount: 18000 },
    { id: "mm6", name: "QuickFlip", tier: "SOVEREIGN", score: 75, active: true, spreadBps: 5, credibility: 0.60, icReward: 0, slashed: false, slashAmount: 0, stakeAmount: 10000 },
    { id: "mm7", name: "SwiftExit", tier: "SOVEREIGN", score: 72, active: true, spreadBps: 5, credibility: 0.55, icReward: 0, slashed: false, slashAmount: 0, stakeAmount: 8000 },
    { id: "mm8", name: "GhostLiq", tier: "SOVEREIGN", score: 70, active: true, spreadBps: 5, credibility: 0.50, icReward: 0, slashed: false, slashAmount: 0, stakeAmount: 5000 },
  ];
}

// ============================================================================
// PRICE / VOLATILITY GENERATOR
// ============================================================================

function generatePrice(tick: number): number {
  if (tick <= 15) {
    // Normal: slight random walk around $4
    return INITIAL_PRICE + Math.sin(tick * 0.3) * 0.05;
  } else if (tick <= 25) {
    // Crash begins: rapid decline
    const crashProgress = (tick - 15) / 10;
    return INITIAL_PRICE * (1 - 0.4 * crashProgress) + Math.sin(tick * 0.8) * 0.03;
  } else if (tick <= 40) {
    // Crisis peak: volatile around bottom
    const base = INITIAL_PRICE * 0.6;
    return base + Math.sin(tick * 1.2) * 0.08 - Math.cos(tick * 0.7) * 0.05;
  } else if (tick <= 52) {
    // Recovery
    const recoveryProgress = (tick - 40) / 12;
    const base = INITIAL_PRICE * 0.6;
    const target = INITIAL_PRICE * 0.85;
    return base + (target - base) * recoveryProgress + Math.sin(tick * 0.5) * 0.03;
  } else {
    // Post-mortem: stabilized
    return INITIAL_PRICE * 0.85 + Math.sin(tick * 0.2) * 0.02;
  }
}

function generateVolatility(tick: number): number {
  if (tick <= 15) return NORMAL_VOL_BPS + Math.random() * 50;
  if (tick <= 20) return NORMAL_VOL_BPS + ((tick - 15) / 5) * 2500;
  if (tick <= 25) return 3000 + Math.random() * 500;
  if (tick <= 35) return 3500 + Math.sin(tick) * 300;
  if (tick <= 40) return 3000 + Math.random() * 200;
  if (tick <= 52) {
    const recovery = (tick - 40) / 12;
    return 3000 * (1 - recovery) + NORMAL_VOL_BPS * recovery;
  }
  return NORMAL_VOL_BPS + Math.random() * 80;
}

function getPhase(tick: number): SimPhase {
  if (tick <= PHASE_TICKS.NORMAL[1]) return "NORMAL";
  if (tick <= PHASE_TICKS.CRASH_BEGINS[1]) return "CRASH_BEGINS";
  if (tick <= PHASE_TICKS.CRISIS_PEAK[1]) return "CRISIS_PEAK";
  if (tick <= PHASE_TICKS.RECOVERY[1]) return "RECOVERY";
  return "POST_MORTEM";
}

// ============================================================================
// TRADITIONAL AMM SIMULATION
// ============================================================================

function simulateTraditionalAMM(
  tick: number,
  volBps: number,
  phase: SimPhase
): { liquidity: number; spreadBps: number; activeMMs: number } {
  switch (phase) {
    case "NORMAL":
      return { liquidity: 100, spreadBps: 5 + Math.random() * 3, activeMMs: TOTAL_MMS };
    case "CRASH_BEGINS": {
      const progress = (tick - 16) / 10;
      const fleeing = Math.floor(progress * 5);
      return {
        liquidity: 100 - progress * 50,
        spreadBps: 5 + progress * 200,
        activeMMs: Math.max(2, TOTAL_MMS - fleeing),
      };
    }
    case "CRISIS_PEAK":
      return {
        liquidity: 12 + Math.random() * 8,
        spreadBps: 400 + Math.random() * 200,
        activeMMs: 1 + Math.floor(Math.random() * 2),
      };
    case "RECOVERY": {
      const rProgress = (tick - 41) / 12;
      return {
        liquidity: 20 + rProgress * 40,
        spreadBps: 400 * (1 - rProgress * 0.7),
        activeMMs: 2 + Math.floor(rProgress * 4),
      };
    }
    case "POST_MORTEM":
      return { liquidity: 65 + Math.random() * 5, spreadBps: 80 + Math.random() * 20, activeMMs: 6 };
    default:
      return { liquidity: 100, spreadBps: 5, activeMMs: TOTAL_MMS };
  }
}

// ============================================================================
// LEX JUSTICIA SIMULATION
// ============================================================================

function simulateLexJusticia(
  tick: number,
  volBps: number,
  phase: SimPhase,
  mms: MMState[],
  distribution: PerformanceDistribution
): {
  liquidity: number;
  spreadBps: number;
  activeMMs: number;
  updatedMMs: MMState[];
  events: SimEvent[];
} {
  const events: SimEvent[] = [];
  const updatedMMs = mms.map((mm) => ({ ...mm }));
  const isCrisis = phase === "CRASH_BEGINS" || phase === "CRISIS_PEAK";
  const currentVol = volBps / 10000;
  const normalVol = NORMAL_VOL_BPS / 10000;

  for (const mm of updatedMMs) {
    if (phase === "NORMAL" || phase === "IDLE") {
      mm.active = true;
      mm.spreadBps = 5 + Math.random() * 3;
      continue;
    }

    if (isCrisis) {
      if (mm.tier === "MARTYR") {
        // Martyrs MUST stay — compute optimal crisis spread
        mm.active = true;
        const spread = calculateOptimalCrisisSpread(
          INITIAL_PRICE, currentVol, normalVol, 0.7, 0.5
        );
        mm.spreadBps = applySpreadConstraint(spread.totalSpread, "MARTYR");
      } else if (mm.tier === "CITIZEN") {
        // Citizens stay with wider spreads, some may leave at peak
        mm.active = phase !== "CRISIS_PEAK" || Math.random() > 0.3;
        if (mm.active) {
          const spread = calculateOptimalCrisisSpread(
            INITIAL_PRICE, currentVol, normalVol, 0.5, 1.0
          );
          mm.spreadBps = applySpreadConstraint(spread.totalSpread, "CITIZEN");
        }
      } else {
        // Sovereigns flee during crisis
        mm.active = false;
        mm.spreadBps = 0;
        if (tick === 17 && mm.id === "mm6") {
          events.push({ tick, type: "WARNING", message: `${mm.name} (Sovereign) withdrew liquidity. No penalty — no commitment made.` });
        }
      }
    }

    if (phase === "RECOVERY") {
      mm.active = true;
      const recoveryProgress = (tick - 41) / 12;
      if (mm.tier === "MARTYR") {
        mm.spreadBps = 40 * (1 - recoveryProgress * 0.7);
        // Calculate IC reward
        mm.icReward = calculateICReward(mm.score, distribution);
        if (tick === 45) {
          events.push({ tick, type: "REWARD", message: `${mm.name} (Martyr) earned IC reward of ${mm.icReward.toFixed(1)} DEEP for crisis commitment.` });
        }
      } else if (mm.tier === "CITIZEN") {
        mm.spreadBps = 50 * (1 - recoveryProgress * 0.5);
      } else {
        mm.spreadBps = 80 * (1 - recoveryProgress * 0.6);
      }
    }

    if (phase === "POST_MORTEM") {
      mm.active = true;
      mm.spreadBps = 5 + Math.random() * 5;
      if (mm.tier === "MARTYR") {
        mm.credibility = updateMMCredibility(mm.credibility, 1.0, 0.7);
      }
    }
  }

  // Aggregate liquidity
  const activeMMs = updatedMMs.filter((mm) => mm.active);
  const activeMartyrCount = activeMMs.filter((mm) => mm.tier === "MARTYR").length;
  const activeCitizenCount = activeMMs.filter((mm) => mm.tier === "CITIZEN").length;

  let liquidity: number;
  if (phase === "NORMAL" || phase === "IDLE") {
    liquidity = 100;
  } else if (isCrisis) {
    // Martyrs provide 25% each, Citizens 15% each
    liquidity = Math.min(100, activeMartyrCount * 25 + activeCitizenCount * 15);
  } else if (phase === "RECOVERY") {
    const rp = (tick - 41) / 12;
    liquidity = 70 + rp * 25;
  } else {
    liquidity = 95;
  }

  const avgSpread =
    activeMMs.length > 0
      ? activeMMs.reduce((s, mm) => s + mm.spreadBps, 0) / activeMMs.length
      : 0;

  return {
    liquidity,
    spreadBps: avgSpread,
    activeMMs: activeMMs.length,
    updatedMMs,
    events,
  };
}

// ============================================================================
// SLASHING EVENTS AT POST-MORTEM
// ============================================================================

function generatePostMortemEvents(
  tick: number,
  mms: MMState[],
  distribution: PerformanceDistribution
): { updatedMMs: MMState[]; events: SimEvent[] } {
  if (tick !== 54) return { updatedMMs: mms, events: [] };

  const events: SimEvent[] = [];
  const updatedMMs = mms.map((mm) => ({ ...mm }));

  // Simulate: one "fake Martyr" who claimed 95 but actual was 78
  // For the demo, let's simulate a hypothetical case in commentary
  const slashResult = calculateSlashingAmount(95, 78, distribution);
  events.push({
    tick,
    type: "SLASH",
    message: `ZK-Proof verification complete. Hypothetical cheater (claimed 95%, actual 78%) slashed: ${slashResult.justification}`,
  });

  // Reward honest Martyrs
  for (const mm of updatedMMs) {
    if (mm.tier === "MARTYR") {
      mm.icReward = calculateICReward(mm.score, distribution);
      events.push({
        tick,
        type: "REWARD",
        message: `${mm.name} verified honest via ZK-proof. Final IC reward: ${mm.icReward.toFixed(1)} DEEP. Credibility updated to ${mm.credibility.toFixed(2)}.`,
      });
    }
  }

  return { updatedMMs, events };
}

// ============================================================================
// HOOK
// ============================================================================

const INITIAL_SCORES = [85, 90, 88, 92, 78, 95, 87, 91, 89, 93, 80, 96, 75, 70, 72, 97];

export function useMarketSimulation() {
  const distribution = useRef(buildDistribution(INITIAL_SCORES));
  const boundaries = useRef(computeOptimalTierBoundaries(distribution.current));

  const [state, setState] = useState<SimulationState>(() => ({
    phase: "IDLE",
    tick: -1,
    maxTick: MAX_TICK,
    isRunning: false,
    speed: 800,
    history: [],
    mms: createInitialMMs(),
    distribution: distribution.current,
    boundaries: boundaries.current,
    commentary: COMMENTARY.IDLE[0],
    events: [],
    currentPrice: INITIAL_PRICE,
    currentVolBps: NORMAL_VOL_BPS,
    isCrisis: false,
    tradLiquidity: 100,
    tradSpreadBps: 5,
    tradActiveMMs: TOTAL_MMS,
    lexLiquidity: 100,
    lexSpreadBps: 5,
    lexActiveMMs: TOTAL_MMS,
  }));

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const commentaryIndex = useRef<Record<SimPhase, number>>({
    IDLE: 0,
    NORMAL: 0,
    CRASH_BEGINS: 0,
    CRISIS_PEAK: 0,
    RECOVERY: 0,
    POST_MORTEM: 0,
  });
  const lastPhaseRef = useRef<SimPhase>("IDLE");

  const advanceTick = useCallback(() => {
    setState((prev) => {
      if (prev.tick >= MAX_TICK) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return { ...prev, isRunning: false };
      }

      const nextTick = prev.tick + 1;
      const price = generatePrice(nextTick);
      const volBps = generateVolatility(nextTick);
      const phase = getPhase(nextTick);
      const isCrisis = phase === "CRASH_BEGINS" || phase === "CRISIS_PEAK";

      // Traditional AMM
      const trad = simulateTraditionalAMM(nextTick, volBps, phase);

      // LEX JUSTICIA
      const lex = simulateLexJusticia(
        nextTick, volBps, phase, prev.mms, distribution.current
      );

      // Post-mortem events
      const pm = generatePostMortemEvents(nextTick, lex.updatedMMs, distribution.current);
      const finalMMs = pm.updatedMMs.length > 0 ? pm.updatedMMs : lex.updatedMMs;
      const allNewEvents = [...lex.events, ...pm.events];

      // Commentary rotation
      if (phase !== lastPhaseRef.current) {
        commentaryIndex.current[phase] = 0;
        lastPhaseRef.current = phase;
      }
      const phaseCommentary = COMMENTARY[phase] || COMMENTARY.IDLE;
      const cIdx = commentaryIndex.current[phase];
      const commentary = phaseCommentary[Math.min(cIdx, phaseCommentary.length - 1)];

      // Advance commentary every 5 ticks
      if (nextTick % 5 === 0) {
        commentaryIndex.current[phase] = Math.min(
          commentaryIndex.current[phase] + 1,
          phaseCommentary.length - 1
        );
      }

      const tickData: TickData = {
        tick: nextTick,
        price,
        volatilityBps: volBps,
        tradLiquidity: trad.liquidity,
        tradSpreadBps: trad.spreadBps,
        tradActiveMMs: trad.activeMMs,
        lexLiquidity: lex.liquidity,
        lexSpreadBps: lex.spreadBps,
        lexActiveMMs: lex.activeMMs,
        phase,
        isCrisis,
      };

      return {
        ...prev,
        tick: nextTick,
        phase,
        currentPrice: price,
        currentVolBps: volBps,
        isCrisis,
        history: [...prev.history, tickData],
        mms: finalMMs,
        commentary,
        events: [...prev.events, ...allNewEvents],
        tradLiquidity: trad.liquidity,
        tradSpreadBps: trad.spreadBps,
        tradActiveMMs: trad.activeMMs,
        lexLiquidity: lex.liquidity,
        lexSpreadBps: lex.spreadBps,
        lexActiveMMs: lex.activeMMs,
      };
    });
  }, []);

  const play = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: true }));
  }, []);

  const pause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  const step = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState((prev) => ({ ...prev, isRunning: false }));
    advanceTick();
  }, [advanceTick]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    commentaryIndex.current = {
      IDLE: 0, NORMAL: 0, CRASH_BEGINS: 0,
      CRISIS_PEAK: 0, RECOVERY: 0, POST_MORTEM: 0,
    };
    lastPhaseRef.current = "IDLE";
    setState({
      phase: "IDLE",
      tick: -1,
      maxTick: MAX_TICK,
      isRunning: false,
      speed: 800,
      history: [],
      mms: createInitialMMs(),
      distribution: distribution.current,
      boundaries: boundaries.current,
      commentary: COMMENTARY.IDLE[0],
      events: [],
      currentPrice: INITIAL_PRICE,
      currentVolBps: NORMAL_VOL_BPS,
      isCrisis: false,
      tradLiquidity: 100,
      tradSpreadBps: 5,
      tradActiveMMs: TOTAL_MMS,
      lexLiquidity: 100,
      lexSpreadBps: 5,
      lexActiveMMs: TOTAL_MMS,
    });
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, speed }));
  }, []);

  // Auto-play interval management
  useEffect(() => {
    if (state.isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(advanceTick, state.speed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.speed, advanceTick]);

  return {
    state,
    play,
    pause,
    step,
    reset,
    setSpeed,
  };
}
