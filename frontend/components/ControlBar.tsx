"use client";

import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";
import type { SimPhase } from "@/lib/useMarketSimulation";

const PHASE_META: Record<SimPhase, { label: string; color: string; icon: string }> = {
  IDLE: { label: "Ready", color: "#64748b", icon: "⏸" },
  NORMAL: { label: "Normal Market", color: "#10b981", icon: "📊" },
  CRASH_BEGINS: { label: "Crash Detected", color: "#f59e0b", icon: "⚠️" },
  CRISIS_PEAK: { label: "Crisis Peak", color: "#ef4444", icon: "🚨" },
  RECOVERY: { label: "Recovery", color: "#3b82f6", icon: "📈" },
  POST_MORTEM: { label: "Post-Mortem", color: "#8b5cf6", icon: "📋" },
};

const ALL_PHASES: SimPhase[] = [
  "NORMAL", "CRASH_BEGINS", "CRISIS_PEAK", "RECOVERY", "POST_MORTEM",
];

interface ControlBarProps {
  phase: SimPhase;
  tick: number;
  maxTick: number;
  isRunning: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

export default function ControlBar({
  phase, tick, maxTick, isRunning, speed,
  onPlay, onPause, onStep, onReset, onSpeedChange,
}: ControlBarProps) {
  const meta = PHASE_META[phase];
  const progress = Math.max(0, ((tick + 1) / (maxTick + 1)) * 100);

  return (
    <div className="card px-6 py-4">
      <div className="flex items-center justify-between gap-6">
        {/* Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-2xl font-bold tracking-tight whitespace-nowrap">
            <span style={{ color: "var(--accent-cyan)" }}>LEX</span>{" "}
            <span style={{ color: "var(--text-primary)" }}>JUSTICIA</span>
          </div>
          <div className="hidden sm:block text-xs px-2 py-1 rounded-md" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
            Market Crash Simulator
          </div>
        </div>

        {/* Phase indicator */}
        <div className="flex items-center gap-2">
          {ALL_PHASES.map((p, i) => {
            const isActive = p === phase;
            const isPast = ALL_PHASES.indexOf(phase) > i;
            const pMeta = PHASE_META[p];
            return (
              <div key={p} className="flex items-center gap-1.5">
                <div
                  className={`phase-dot ${isActive ? "phase-dot-active" : ""}`}
                  style={{
                    backgroundColor: isActive ? pMeta.color : isPast ? pMeta.color : "var(--border)",
                    color: pMeta.color,
                    opacity: isActive ? 1 : isPast ? 0.6 : 0.25,
                  }}
                />
                <span
                  className="text-xs hidden lg:inline"
                  style={{ color: isActive ? pMeta.color : "var(--text-muted)", fontWeight: isActive ? 600 : 400 }}
                >
                  {pMeta.label}
                </span>
                {i < ALL_PHASES.length - 1 && (
                  <div className="w-4 h-px hidden lg:block" style={{ background: isPast ? pMeta.color : "var(--border)" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Speed */}
          <select
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="text-xs px-2 py-1.5 rounded-md border cursor-pointer"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <option value={1200}>0.5×</option>
            <option value={800}>1×</option>
            <option value={400}>2×</option>
            <option value={200}>4×</option>
          </select>

          <button
            onClick={onReset}
            className="p-2 rounded-lg border transition-colors cursor-pointer"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={onStep}
            className="p-2 rounded-lg border transition-colors cursor-pointer"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            title="Step"
          >
            <SkipForward size={16} />
          </button>

          <button
            onClick={isRunning ? onPause : onPlay}
            className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all cursor-pointer"
            style={{
              background: isRunning ? "var(--accent-red)" : "var(--accent-blue)",
              color: "white",
            }}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            {isRunning ? "Pause" : tick < 0 ? "Start Demo" : "Resume"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track mt-3">
        <div
          className="progress-fill"
          style={{
            width: `${progress}%`,
            background: meta.color,
          }}
        />
      </div>
    </div>
  );
}
