# Task 5 — Auth Pages (Agent: Frontend/Auth)

## Summary
Built the 5 auth routes (1 shared layout + 4 pages) for the Votewise auth flow using the existing emerald design system, shadcn Form wrapper, react-hook-form + zod resolvers, and `apiFetch` client.

## Files written
- `src/app/(auth)/layout.tsx` — shared split-screen layout (server component)
- `src/app/(auth)/login/page.tsx` — login (Suspense-wrapped, demo accounts, quick-fill)
- `src/app/(auth)/register/page.tsx` — register (strength meter + requirement checklist)
- `src/app/(auth)/forgot-password/page.tsx` — forgot password (anti-enumeration + devResetUrl dev hint)
- `src/app/(auth)/reset-password/page.tsx` — reset password (Suspense-wrapped, no-token error state, success card)

## Shared components created (for reuse by later tasks)
- `src/components/shared/rotating-stat.tsx` — Framer Motion rotating stat for the auth brand panel (cycles 4 institutional stats every 4.2s).
- `src/components/shared/password-strength.tsx` — exports:
  - `scorePassword(pw)` → `{score: 0|1|2|3, label, checks}`
  - `<PasswordStrengthMeter password />` — 3-segment bar + Weak/Fair/Strong label (destructive/warning/success colors).
  - `<PasswordRequirements password />` — checklist (8+ chars, uppercase, number) that ticks off live.
  - Reuse these in any future onboarding/voter password screens.

## Behavior notes (for downstream agents)
- **Login**: redirects to `?next` (validated to start with `/`) or `/dashboard` on success. `Quick fill` button sets org-owner creds and submits in one click. Demo credentials block is a Collapsible with copy-to-clipboard buttons for email & password. Remember-me checkbox is present (UI-only; session is the cookie).
- **Register**: posts `{name,email,password,organizationName}`. Server already auto-creates org + session, so on success we route straight to `/dashboard`. Strength meter + live requirement checklist.
- **Forgot password**: always shows success state (anti-enumeration, matches backend behavior). In non-production the backend returns `devResetUrl`; we surface it as a highlighted `warning`-colored Alert with a clickable link → completes the reset flow for QA.
- **Reset password**: reads `?token=` from URL via `useSearchParams` (wrapped in Suspense). No token → dedicated "Invalid reset link" error card. Token present → form with new password + confirm + strength meter. On success → success card with "Continue to login" button; form is replaced (can't resubmit). Backend `INVALID_TOKEN` error is surfaced in a destructive Alert.
- All forms use shadcn `<Form>` (react-hook-form) + `zodResolver`. Validators imported from `@/lib/validators` — no duplication.

## Layout structure
- Root: `min-h-screen grid md:grid-cols-2` (grid is the flex container; right column has its own `min-h-screen flex flex-col` so the footer `mt-auto` sticks to viewport bottom on both mobile and desktop).
- LEFT panel (hidden on mobile, md+): `bg-primary` emerald with `bg-grid` overlay (white border variant), two radial glow blobs, custom inline brand mark (white-on-emerald), headline "Secure elections start here.", 3 trust bullets (LockKeyhole/ShieldCheck/Users), and `<RotatingStat />` at the bottom with progress dots.
- RIGHT panel: mobile shows `<Logo size="md" />` at top; form card centered with `animate-fade-in-up`; sticky footer with copyright + security tagline.

## Suspense boundaries
- `login/page.tsx` and `reset-password/page.tsx` both wrap their `useSearchParams`-using content in `<Suspense>` with a skeleton fallback (matches the Next 16 build requirement to avoid CSR bailout errors).

## API wiring
- All calls use `apiFetch<T>(url, {method, body})` from `@/lib/api-fetch`.
- `credentials: "include"` is already baked into `apiFetch`, so the `votewise_session` cookie is sent/received automatically — no manual cookie handling.
- Toasts via `sonner` (mounted in root layout).

## Verification
- All 4 routes return HTTP 200 against the running dev server:
  - `GET /login` → 200
  - `GET /register` → 200
  - `GET /forgot-password` → 200
  - `GET /reset-password` (no token) → 200 (renders invalid-token card)
  - `GET /reset-password?token=abc` → 200 (renders reset form)
- `bun run lint` on auth files: **0 errors**. (Project-wide lint has 2 pre-existing errors in `src/services/voter.service.ts` from Task 1 — not in my files.)
- Fixed one runtime issue during dev: lucide-react exports `Link2Off` (not `LinkOff`).

## Things future agents should know
- The auth layout's left brand panel hardcodes the inline SVG logo (white-on-emerald treatment) because the shared `<Logo />` component uses `bg-primary` for its box which is invisible on a primary background. If you need a white logo variant elsewhere on dark backgrounds, either reuse this pattern or extend `<Logo>` with a `variant="onPrimary"` prop.
- The "Remember me" checkbox is UI-only. If you need persistent email prefill later, wire it to `localStorage` in `LoginForm`.
- `/reset-password` will redirect already-authenticated users to `/dashboard` (handled by `src/proxy.ts`).
