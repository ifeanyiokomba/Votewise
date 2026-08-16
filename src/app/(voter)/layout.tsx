import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { SupportChatWidget } from "@/components/shared/support-chat-widget";
import { APP_NAME } from "@/lib/constants";
import { ShieldCheck } from "lucide-react";

/**
 * Shared layout for the public voter + results experience.
 * - Logo top-centered (calm, institutional).
 * - Main content fills the page.
 * - Sticky minimal footer (mt-auto) — kept tiny on purpose so the ballot
 *   flow stays focused. No marketing nav, no heavy socials.
 */
export default function VoterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Soft emerald glow at the top — reinforces institutional trust */}
      <div
        aria-hidden
        className="bg-radial-fade pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70"
      />

      <header className="relative z-10 px-4 pt-6 sm:pt-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 text-center">
          <Link
            href="/"
            aria-label={`${APP_NAME} home`}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <Logo size="lg" />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Secure election platform</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 px-4 py-6 sm:py-10">
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </main>

      <footer className="mt-auto border-t border-border/60 bg-secondary/30">
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
          <p>
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            Tamper-evident ballots · End-to-end verification
          </p>
        </div>
      </footer>

      {/* Floating support chat for voters */}
      <SupportChatWidget />
    </div>
  );
}
