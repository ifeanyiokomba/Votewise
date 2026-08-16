"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

type Stat = { value: string; label: string };

const STATS: Stat[] = [
  { value: "40+", label: "Nigerian institutions trust Votewise" },
  { value: "1.2M+", label: "Ballots cast & verified securely" },
  { value: "99.99%", label: "Election-day uptime record" },
  { value: "256-bit", label: "End-to-end encryption on every ballot" },
];

export function RotatingStat({ intervalMs = 4200 }: { intervalMs?: number }) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % STATS.length),
      intervalMs
    );
    return () => clearInterval(id);
  }, [intervalMs]);

  const stat = STATS[index];

  return (
    <div className="relative h-24 w-full max-w-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <div className="text-4xl font-bold tracking-tight text-white">
            {stat.value}
          </div>
          <p className="mt-1 text-sm leading-snug text-white/75">
            {stat.label}
          </p>
        </motion.div>
      </AnimatePresence>
      <div className="absolute -bottom-2 left-0 flex gap-1.5">
        {STATS.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
