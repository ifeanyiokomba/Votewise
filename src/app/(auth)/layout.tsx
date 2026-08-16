import * as React from "react";
import { ShieldCheck, LockKeyhole, Users } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { RotatingStat } from "@/components/shared/rotating-stat";
import { APP_NAME } from "@/lib/constants";

const TRUST_BULLETS = [
  {
    icon: LockKeyhole,
    title: "Bank-grade security",
    body: "End-to-end encryption, httpOnly sessions, and per-voter OTP verification.",
  },
  {
    icon: ShieldCheck,
    title: "Auditable by design",
    body: "Immutable audit trail with tamper-evident receipts for every ballot cast.",
  },
  {
    icon: Users,
    title: "Built for institutions",
    body: "Universities, unions, cooperatives and associations run trusted elections.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid bg-background md:grid-cols-2">
      {/* LEFT — branded panel (hidden on mobile) */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground md:flex md:flex-col md:justify-between md:p-12 lg:p-16">
        {/* subtle grid overlay */}
        <div
          aria-hidden
          className="bg-grid pointer-events-none absolute inset-0 opacity-[0.12]"
          style={
            {
              "--border": "rgba(255,255,255,0.5)",
            } as React.CSSProperties
          }
        />
        {/* radial glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-emerald-300/15 blur-3xl"
        />

        {/* Brand mark */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 2.5 20 6v5.5c0 4.6-3.2 8.8-8 10-4.8-1.2-8-5.4-8-10V6l8-3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  fill="currentColor"
                  fillOpacity="0.18"
                />
                <path
                  d="m9 12 2 2 4-4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight">{APP_NAME}</span>
          </div>
        </div>

        {/* Headline + bullets */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
            Secure elections start here.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-white/75">
            Run transparent, auditable elections for your organization — from
            voter verification to real-time monitoring and tamper-evident
            results.
          </p>

          <ul className="mt-8 space-y-5">
            {TRUST_BULLETS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-4.5 text-white" />
                </span>
                <div>
                  <div className="font-semibold text-white">{title}</div>
                  <p className="text-sm leading-snug text-white/70">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Rotating stat */}
        <div className="relative z-10">
          <RotatingStat />
          <p className="mt-8 text-xs text-white/55">
            Trusted by institutions across Nigeria &amp; beyond.
          </p>

          {/* Institution types */}
          <div className="mt-6 flex flex-wrap gap-1.5">
            {["Universities", "Student Unions", "Associations", "Cooperatives", "NGOs", "Clubs"].map(
              (type) => (
                <span
                  key={type}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white/80 ring-1 ring-white/10"
                >
                  {type}
                </span>
              )
            )}
          </div>
        </div>
      </aside>

      {/* RIGHT — form panel */}
      <main className="flex min-h-screen flex-col">
        {/* Logo on mobile */}
        <div className="flex justify-center p-6 md:hidden">
          <Logo size="md" />
        </div>

        {/* Centered form card */}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-8 lg:p-10">
          <div className="w-full max-w-md animate-fade-in-up">{children}</div>
        </div>

        {/* Sticky footer note */}
        <footer className="mt-auto border-t border-border/70 px-6 py-4">
          <div className="mx-auto flex max-w-md flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
            <p>
              © {new Date().getFullYear()} {APP_NAME} — A product of Okomba Analytics.
            </p>
            <p className="text-center sm:text-right">
              ISO-grade security · Tamper-evident receipts
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
