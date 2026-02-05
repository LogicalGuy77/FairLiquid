"use client";

import { useMarketSimulation, type MMState } from "@/lib/useMarketSimulation";
import ControlBar from "@/components/ControlBar";
import CommentaryBox from "@/components/CommentaryBox";
import PriceChart from "@/components/PriceChart";
import ComparisonPanel from "@/components/ComparisonPanel";
import TierCards from "@/components/TierCards";
import MMTable from "@/components/MMTable";

function computeTierInfo(mms: MMState[], tier: "MARTYR" | "CITIZEN" | "SOVEREIGN") {
  const members = mms.filter((m) => m.tier === tier);
  if (members.length === 0)
    return { name: tier, count: 0, avgSpread: 0, avgCredibility: 0, totalReward: 0, totalSlash: 0, active: 0 };

  const active = members.filter((m) => m.active).length;
  const avgSpread = members.reduce((s, m) => s + m.spreadBps, 0) / members.length;
  const avgCredibility = (members.reduce((s, m) => s + m.credibility, 0) / members.length) * 100;
  const totalReward = members.reduce((s, m) => s + m.icReward, 0);
  const totalSlash = members.reduce((s, m) => s + m.slashAmount, 0);

  return { name: tier, count: members.length, avgSpread, avgCredibility, totalReward, totalSlash, active };
}

export default function Home() {
  const { state, play, pause, step, reset, setSpeed } = useMarketSimulation();

  const martyrs = computeTierInfo(state.mms, "MARTYR");
  const citizens = computeTierInfo(state.mms, "CITIZEN");
  const sovereigns = computeTierInfo(state.mms, "SOVEREIGN");

  return (
    <main
      className="min-h-screen px-4 py-6 md:px-8"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Control Bar */}
        <ControlBar
          phase={state.phase}
          tick={state.tick}
          maxTick={state.maxTick}
          isRunning={state.isRunning}
          speed={state.speed}
          onPlay={play}
          onPause={pause}
          onStep={step}
          onReset={reset}
          onSpeedChange={setSpeed}
        />

        {/* Commentary */}
        <CommentaryBox
          commentary={state.commentary}
          phase={state.phase}
          events={state.events}
          tick={state.tick}
        />

        {/* Price Chart */}
        <PriceChart history={state.history} currentPrice={state.currentPrice} />

        {/* Comparison Panel — Traditional vs LEX JUSTICIA */}
        <ComparisonPanel
          history={state.history}
          tradLiquidity={state.tradLiquidity}
          tradSpreadBps={state.tradSpreadBps}
          tradActiveMMs={state.tradActiveMMs}
          lexLiquidity={state.lexLiquidity}
          lexSpreadBps={state.lexSpreadBps}
          lexActiveMMs={state.lexActiveMMs}
          isCrisis={state.isCrisis}
        />

        {/* Tier Cards */}
        <TierCards
          martyrs={martyrs}
          citizens={citizens}
          sovereigns={sovereigns}
          isCrisis={state.isCrisis}
        />

        {/* MM Table */}
        <MMTable mms={state.mms} isCrisis={state.isCrisis} />

        {/* Footer */}
        <footer className="text-center py-4 text-xs" style={{ color: "var(--text-muted)" }}>
          LEX JUSTICIA — Myersonian Mechanism Design for Fair DeFi Market-Making
          <br />
          <span className="opacity-60">
            Built with Sui Move • Powered by Theorem 3.2 Virtual Value Scoring
          </span>
        </footer>
      </div>
    </main>
  );
}