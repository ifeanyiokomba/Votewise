"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

/**
 * Template styles that cascade across the voter journey.
 * The org admin picks one of 6 themes on the Results tab;
 * it gets applied to the landing, verify, ballot, and receipt pages.
 */
export const TEMPLATE_STYLES: Record<
  string,
  {
    heroGradient: string;
    heroRing: string;
    bgAccent: string;
    headingClass: string;
    ctaClass: string;
    cardBorder: string;
    progressBar: string;
    label: string;
  }
> = {
  classic: {
    heroGradient: "from-primary/5 via-accent/30 to-background",
    heroRing: "bg-primary/10",
    bgAccent: "bg-primary/10",
    headingClass: "tracking-tight",
    ctaClass: "",
    cardBorder: "border-border",
    progressBar: "bg-primary",
    label: "Classic",
  },
  modern: {
    heroGradient: "from-fuchsia-500/10 via-pink-500/5 to-violet-500/10",
    heroRing: "bg-fuchsia-500/15",
    bgAccent: "bg-fuchsia-500/10",
    headingClass: "tracking-tight bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-transparent",
    ctaClass: "bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700",
    cardBorder: "border-fuchsia-200 dark:border-fuchsia-900",
    progressBar: "bg-fuchsia-600",
    label: "Modern",
  },
  editorial: {
    heroGradient: "from-amber-500/10 via-orange-500/5 to-red-500/10",
    heroRing: "bg-amber-500/15",
    bgAccent: "bg-amber-500/10",
    headingClass: "font-serif tracking-tight",
    ctaClass: "bg-amber-700 hover:bg-amber-800",
    cardBorder: "border-amber-200 dark:border-amber-900",
    progressBar: "bg-amber-700",
    label: "Editorial",
  },
  minimal: {
    heroGradient: "from-zinc-100 via-zinc-50 to-white dark:from-zinc-900 dark:via-zinc-950 dark:to-black",
    heroRing: "bg-zinc-300 dark:bg-zinc-700",
    bgAccent: "bg-zinc-200 dark:bg-zinc-800",
    headingClass: "tracking-tight font-light",
    ctaClass: "",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    progressBar: "bg-zinc-700",
    label: "Minimal",
  },
  regal: {
    heroGradient: "from-amber-900/20 via-zinc-900/30 to-amber-900/10 dark:from-amber-900/40 dark:via-black dark:to-amber-950/40",
    heroRing: "bg-amber-500/20",
    bgAccent: "bg-amber-500/10",
    headingClass: "tracking-tight text-amber-700 dark:text-amber-400 font-serif",
    ctaClass: "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-amber-950",
    cardBorder: "border-amber-700/30 dark:border-amber-800/50",
    progressBar: "bg-amber-600",
    label: "Regal",
  },
  civic: {
    heroGradient: "from-sky-700/10 via-blue-700/5 to-indigo-800/10",
    heroRing: "bg-sky-700/15",
    bgAccent: "bg-sky-700/10",
    headingClass: "tracking-tight text-sky-800 dark:text-sky-300",
    ctaClass: "bg-sky-800 hover:bg-sky-900",
    cardBorder: "border-sky-200 dark:border-sky-900",
    progressBar: "bg-sky-700",
    label: "Civic",
  },
};

/**
 * Fetch the voter template for an election. Returns "classic" by default.
 * Used by verify/ballot/receipt pages to apply consistent theming.
 */
export function useVoterTemplate(electionId: string | null | undefined) {
  const [template, setTemplate] = useState<string>("classic");

  useEffect(() => {
    if (!electionId) return;
    let cancelled = false;
    (async () => {
      const res = await apiFetch<{ published: boolean; voterTemplate?: string }>(
        `/api/public/results/${electionId}`
      );
      if (cancelled) return;
      if (res.success && res.data?.voterTemplate) {
        setTemplate(res.data.voterTemplate);
      }
    })();
    return () => { cancelled = true; };
  }, [electionId]);

  return {
    template,
    styles: TEMPLATE_STYLES[template] ?? TEMPLATE_STYLES.classic,
  };
}
