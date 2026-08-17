"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Animated security background — floating vote/ballot icons, shield pulses,
 * and encryption particles that visually communicate how Votewise secures votes.
 */
export function SecurityBackground({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  if (reduce) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      {/* Large gradient orbs */}
      <motion.div
        className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-chart-2/10 blur-3xl"
        animate={{
          x: [0, -25, 0],
          y: [0, 15, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-chart-3/10 blur-3xl"
        animate={{
          x: [0, 20, 0],
          y: [0, -10, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Floating ballot/vote icons */}
      {[...Array(6)].map((_, i) => {
        const icons = ["🗳️", "✓", "🔒", "⚡", "🛡️", "📊"];
        const positions = [
          { left: "8%", top: "15%" },
          { left: "85%", top: "20%" },
          { left: "15%", top: "70%" },
          { left: "90%", top: "65%" },
          { left: "45%", top: "8%" },
          { left: "50%", top: "85%" },
        ];
        const pos = positions[i];
        return (
          <motion.div
            key={i}
            className="absolute text-2xl opacity-[0.07]"
            style={pos}
            animate={{
              y: [0, -20, 0],
              opacity: [0.05, 0.12, 0.05],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 6 + i * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.8,
            }}
          >
            {icons[i]}
          </motion.div>
        );
      })}

      {/* Animated connection lines (representing vote flow / data integrity) */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--chart-2)" />
          </linearGradient>
        </defs>
        {[...Array(4)].map((_, i) => (
          <motion.path
            key={i}
            d={`M ${i * 200 + 50} 0 Q ${i * 200 + 150} ${300 + i * 100} ${i * 200 + 300} ${600 + i * 50}`}
            stroke="url(#flow-grad)"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="5 10"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1, strokeDashoffset: [0, -15] }}
            transition={{
              pathLength: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              strokeDashoffset: { duration: 2, repeat: Infinity, ease: "linear" },
            }}
          />
        ))}
      </svg>

      {/* Pulsing shield indicator (security) */}
      <motion.div
        className="absolute right-10 top-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="grid h-32 w-32 place-items-center rounded-full bg-primary/5">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L4 6v6c0 4.5 3 8.5 8 10 5-1.5 8-5.5 8-10V6l-8-4z"
              stroke="var(--primary)"
              strokeWidth="1.5"
              fill="var(--primary)"
              fillOpacity="0.2"
            />
            <path
              d="M9 12l2 2 4-4.5"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Animated vote-counting visualization — floating ballot marks that "drop"
 * into a counter, showing how votes are counted securely.
 */
export function VoteCountingAnimation({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className ?? ""}`} aria-hidden>
      {/* Falling ballot particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute flex h-6 w-6 items-center justify-center rounded-md border border-primary/20 bg-primary/5 text-[10px] font-bold text-primary/40"
          style={{ left: `${(i * 8.5 + 5) % 100}%`, top: "-30px" }}
          animate={{
            y: ["-30px", "400px"],
            opacity: [0, 0.6, 0],
            rotate: [0, 15, -5, 0],
          }}
          transition={{
            duration: 5 + (i % 3) * 2,
            repeat: Infinity,
            delay: i * 0.7,
            ease: "easeIn",
          }}
        >
          ✓
        </motion.div>
      ))}

      {/* Counting bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden bg-muted/30">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-primary to-chart-2"
          animate={{
            width: ["0%", "100%"],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  );
}

/**
 * Animated encryption/data-flow particles — small dots that flow along paths,
 * representing secure data transmission.
 */
export function DataFlowParticles({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-primary/30"
          style={{ left: `${10 + i * 12}%` }}
          animate={{
            y: ["0vh", "100vh"],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 8 + (i % 4) * 3,
            repeat: Infinity,
            delay: i * 1.2,
            ease: "linear",
          }}
        />
      ))}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`r-${i}`}
          className="absolute h-1 w-1 rounded-full bg-chart-2/40"
          style={{ left: `${20 + i * 15}%` }}
          animate={{
            y: ["100vh", "0vh"],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 10 + (i % 3) * 4,
            repeat: Infinity,
            delay: i * 1.5,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Count-up number animation — animates from 0 to a target number.
 */
export function CountUpNumber({
  target,
  duration = 2,
  className,
}: {
  target: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(() => (reduce ? target : 0));

  useEffect(() => {
    if (reduce) return;
    let startTime: number | null = null;
    let raf: number;

    function animate(time: number) {
      if (startTime === null) startTime = time;
      const elapsed = (time - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);

  return <span className={className}>{count.toLocaleString()}</span>;
}

import { useState, useEffect } from "react";
