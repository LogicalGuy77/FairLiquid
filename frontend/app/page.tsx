"use client";

import { useState } from "react";
import { useMarketSimulation, type MMState } from "@/lib/useMarketSimulation";
import ControlBar from "@/components/ControlBar";
import CommentaryBox from "@/components/CommentaryBox";
import PriceChart from "@/components/PriceChart";
import ComparisonPanel from "@/components/ComparisonPanel";
import TierCards from "@/components/TierCards";
import MMTable from "@/components/MMTable";
import OnChainPanel from "@/components/OnChainPanel";
import { Play, Globe } from "lucide-react";

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

type Tab = "simulation" | "live";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("simulation");
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
        {/* Header with tabs */}
        <div className="card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold tracking-tight whitespace-nowrap">
                <span style={{ color: "var(--accent-cyan)" }}>LEX</span>{" "}
                <span style={{ color: "var(--text-primary)" }}>JUSTICIA</span>
              </div>
              <div className="hidden sm:block text-xs px-2 py-1 rounded-md" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                Myersonian Market-Making
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <button
                onClick={() => setActiveTab("simulation")}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: activeTab === "simulation" ? "var(--accent-blue)" : "transparent",
                  color: activeTab === "simulation" ? "white" : "var(--text-muted)",
                }}
              >
                <Play size={12} /> Simulation
              </button>
              <button
                onClick={() => setActiveTab("live")}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: activeTab === "live" ? "var(--accent-cyan)" : "transparent",
                  color: activeTab === "live" ? "white" : "var(--text-muted)",
                }}
              >
                <Globe size={12} /> Live Testnet
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "simulation" ? (
          <>
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
          </>
        ) : (
          <OnChainPanel />
        )}

        {/* Footer */}
        <footer className="text-center py-4 text-xs" style={{ color: "var(--text-muted)" }}>
          LEX JUSTICIA — Myersonian Mechanism Design for Fair DeFi Market-Making
          <br />
          <span className="opacity-60">
            Built with Sui Move • Deployed on Testnet • <a href="https://arxiv.org/abs/your-paper-id" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Research Paper</a>
          </span>
        </footer>
      </div>
    </main>
  );
}