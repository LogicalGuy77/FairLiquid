"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import type { SimPhase, SimEvent } from "@/lib/useMarketSimulation";

const PHASE_COLORS: Record<SimPhase, string> = {
  IDLE: "var(--text-muted)",
  NORMAL: "var(--accent-green)",
  CRASH_BEGINS: "var(--accent-amber)",
  CRISIS_PEAK: "var(--accent-red)",
  RECOVERY: "var(--accent-blue)",
  POST_MORTEM: "var(--accent-purple)",
};

const EVENT_COLORS: Record<SimEvent["type"], string> = {
  INFO: "var(--accent-blue)",
  CRISIS: "var(--accent-red)",
  SLASH: "var(--accent-red)",
  REWARD: "var(--accent-green)",
  WARNING: "var(--accent-amber)",
};

interface CommentaryBoxProps {
  commentary: string;
  phase: SimPhase;
  events: SimEvent[];
  tick: number;
}

export default function CommentaryBox({ commentary, phase, events, tick }: CommentaryBoxProps) {
  // Show only last 3 events
  const recentEvents = events.slice(-3);

  return (
    <div className="card p-4" style={{ borderColor: PHASE_COLORS[phase] }}>
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg mt-0.5 shrink-0"
          style={{ background: `color-mix(in srgb, ${PHASE_COLORS[phase]} 15%, transparent)` }}
        >
          <MessageSquare size={18} style={{ color: PHASE_COLORS[phase] }} />
        </div>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.p
              key={commentary}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-primary)" }}
            >
              {commentary}
            </motion.p>
          </AnimatePresence>

          {/* Recent events */}
          {recentEvents.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {recentEvents.map((event, i) => (
                <motion.div
                  key={`${event.tick}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-xs flex items-start gap-2"
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: EVENT_COLORS[event.type] }}
                  />
                  <span style={{ color: "var(--text-secondary)" }}>
                    <span className="font-mono" style={{ color: "var(--text-muted)" }}>
                      t={event.tick}
                    </span>{" "}
                    {event.message}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
