# Votewise — Project Worklog

> Shared handover document for all agents working on the Votewise build.
> Append (never overwrite) a new `---` section after your Task ID finishes.

---

Task ID: 1
Agent: Lead (orchestrator)
Task: Foundation — Prisma schema (SQLite), db, lib utilities, auth/session, middleware, theme, shared components, seed.

Work Log:
- Cloned & audited upstream repo `Ifeanyiokomba/votewise` (Next 16, Postgres, next-auth). Decided to rebuild faithfully in the SQLite sandbox with a self-contained jose/bcrypt session instead of next-auth.
- Installed deps: bcryptjs, jose, papaparse, xlsx (+types).
- Wrote `prisma/schema.prisma` adapted to SQLite (enums + Json emulated). Ran `db:push`.
- Wrote `src/lib/*`: constants, errors, api-response, session (jose JWT cookie), tenant, rate-limit, validators, email-templates, utils (slug/currency/format), api-fetch (client), db (warn/error only).
- Wrote `src/services/*`: audit, security, notification, otp, vote, result, pricing, organization, election, position, candidate, voter, subscription, support, user, activation.
- Wrote `src/app/api/**` routes: auth (register/login/logout/me/forgot/reset), elections + [id] (get/patch/status/results/results-publish/analytics/audit/activation/activation-pay/activation-negotiate), positions, candidates, voters + import, voter (verify/vote/vote-cast/ballot-status/receipt), public (results/[id], verify-ballot), admin (stats/security/users/[id]/subscription/upgrade/cancel/negotiations/[id]), support + [id] + messages, notifications + [id]/read, health.
- Wrote `prisma/seed.ts` — platform admin, demo org "Nnamdi Azikiwe University" (slug `unizik`), 3 elections (1 LIVE, 1 SCHEDULED/draft, 1 PUBLISHED with votes), voters, audit logs, security events, support ticket.
- Wrote `src/proxy.ts` (Next 16 proxy convention) gating protected routes.
- Wrote `src/app/globals.css` (institutional emerald theme + dark mode + premium helpers: bg-grid, text-gradient, pulse-dot, fade-in-up, custom scrollbar).
- Wrote shared components: `src/components/shared/{logo,password-input,theme-provider,theme-toggle,status-badge,stat-card}.tsx`.
- Updated `src/app/layout.tsx` (metadata + ThemeProvider + Sonner).

Stage Summary:
- DB seeded & dev server compiles cleanly on :3000.
- Demo credentials: admin `admin@votewise.com.ng / Admin@12345`; org owner `demo@votewise.com.ng / Demo@1234`.
- Voter sample: email `voter1@unizik.edu.ng`, matric `UNIZIK/2020/1000`.

## API Contract Reference (for frontend agents)

All routes return `{ success: true, data }` or `{ success: false, error: { message, code, details? } }`. Client helper: `apiFetch<T>(url, init)` from `@/lib/api-fetch`.

Auth:
- `POST /api/auth/register` body `{name,email,password,organizationName}` → `{user,organization}`. Sets session cookie.
- `POST /api/auth/login` `{email,password}` → `{user}`.
- `POST /api/auth/logout`.
- `GET /api/auth/me` → `{user, organization}` or `{user:null}`.
- `POST /api/auth/forgot-password` `{email}` → `{requested:true}`.
- `POST /api/auth/reset-password` `{token,password,confirmPassword}` → `{reset:true}`.

Elections (org admin only):
- `GET /api/elections` → `{elections:[{...,_count:{voters,positions,candidates}}]}`.
- `POST /api/elections` `{name,description?,type,startTime?,endTime?,timezone?}` → `{election}` (or `{limitExceeded:true,message}` if plan full).
- `GET/PATCH /api/elections/[id]`.
- `POST /api/elections/[id]/status` `{status}` → `{election}` (or `{activationRequired:true,message}` when going LIVE unpaid).
- `GET/POST /api/elections/[id]/positions` `{title,description?,maxChoices?,order?}`.
- `PATCH/DELETE /api/elections/[id]/positions/[positionId]`.
- `GET/POST /api/elections/[id]/candidates` `{name,photo?,bio?,manifesto?,positionId}`.
- `PATCH/DELETE /api/elections/[id]/candidates/[candidateId]`.
- `GET /api/elections/[id]/voters?search=` → `{voters}`. `POST` `{id,eligible}` toggle.
- `POST /api/elections/[id]/voters/import` multipart `file` + `mode`(preview|import) → preview stats or import summary.
- `GET /api/elections/[id]/results` → `{results,visible}` (full ElectionResults object).
- `POST /api/elections/[id]/results/publish` → `{election}`.
- `GET /api/elections/[id]/analytics` → `{stats,timeline,results}`.
- `GET /api/elections/[id]/audit` → `{logs}`.
- `GET /api/elections/[id]/activation` → `{activation}`. `POST .../activation/pay` → `{payment}`. `POST .../activation/negotiate` `{contactName,contactEmail,contactPhone?,message?,proposedAmount?}`.

Voter (public, no session):
- `POST /api/voter/verify` `{electionId, voterId, channel?, code?}`:
  - if no code → sends OTP, returns `{sent, attemptsRemaining, voterId, channel, devCode}` (devCode only in non-prod, show it in a dev hint box).
  - if code → `{verified, error?, voterId}`.
  - returns `{alreadyVoted:true}` if already voted.
- `POST /api/voter/vote` `{voterId,electionId}` → `{session, ballot:{electionName,positions:[{id,title,description,maxChoices,candidates:[{id,name,photo,bio,manifesto}]}]}}` or `{alreadyVoted:true}`.
- `POST /api/voter/vote/cast` `{voterId,electionId,sessionId,votes:[{positionId,candidateId}]}` → `{receipt,count}`.
- `POST /api/voter/ballot-status` `{voterId,electionId}` → `{hasVoted}`.
- `POST /api/voter/receipt` `{reference}` → `{verified,reference,timestamp}`.

Public:
- `GET /api/public/results/[id]` → if published `{published:true, election, results}`, else `{published:false,status,electionName,electionId}`.
- `POST /api/public/verify-ballot` `{reference}` → `{verified,reference,timestamp}`.

Admin (org admin):
- `GET /api/admin/stats` → `{stats,orgStats,recentEvents,recentAudit,elections}`.
- `GET /api/admin/security` → `{events}`. `PATCH` `{id}` resolve.
- `GET /api/admin/users` → `{users}`. `PATCH /api/admin/users/[id]` `{role?,isActive?}`.
- `GET /api/admin/subscription` → `{subscription}`. `POST .../upgrade {tier}`. `POST .../cancel`.

Platform admin:
- `GET /api/admin/negotiations` → `{negotiations}`. `PATCH /api/admin/negotiations/[id]` `{status,negotiatedAmount?,internalNotes?,assignedToId?}`.

Support (org member):
- `GET/POST /api/support` `{subject,description,priority}`.
- `GET/PATCH /api/support/[id]` (PATCH `{status?,assignedToId?}`).
- `GET/POST /api/support/[id]/messages` `{body,isInternal?}`.

Notifications:
- `GET /api/notifications` → `{notifications}`. `POST /api/notifications/[id]/read`.

## Shared components available
- `@/components/ui/*` — full shadcn set (button, card, input, label, dialog, dropdown-menu, select, table, tabs, badge, progress, skeleton, sheet, alert, alert-dialog, tooltip, avatar, separator, scroll-area, input-otp, switch, radio-group, form, etc.).
- `@/components/shared/logo` (`<Logo size="sm|md|lg" />`).
- `@/components/shared/password-input`.
- `@/components/shared/theme-provider` + `theme-toggle`.
- `@/components/shared/status-badge` (`<StatusBadge status="LIVE" />`).
- `@/components/shared/stat-card` (`<StatCard label value icon hint trend />`).
- `@/lib/utils` helpers: cn, slugify, formatCurrency, formatNumber, formatPercent, formatDate, formatRelative, timeUntil, initials, truncate, maskEmail, maskPhone.
- Toasts: `import { toast } from "sonner"` (Sonner) — already mounted. Also shadcn `useToast` available.

## Design system (MANDATORY)
- Institutional emerald theme already in globals.css. Use `bg-primary`, `text-primary`, etc. NO indigo/blue.
- Premium, trustworthy, modern SaaS. Mobile-first. Sticky footer where applicable.
- Use `bg-grid` / `bg-radial-fade` / `text-gradient` helpers from globals.css for hero sections.
- Status colors via `<StatusBadge>`.
- Footer must be sticky to bottom (root wrapper `min-h-screen flex flex-col`, footer `mt-auto`).

## Auth model
- Session is an httpOnly cookie `votewise_session` (jose JWT). `GET /api/auth/me` returns current user+org.
- Roles: PLATFORM_ADMIN, ORG_OWNER, ORG_ADMIN, ELECTION_MANAGER, ELECTION_OFFICER, OBSERVER, AUDITOR, VOTER.
- Org admin = PLATFORM_ADMIN|ORG_OWNER|ORG_ADMIN.

---

Task ID: 5
Agent: Frontend / Auth
Task: Authentication pages — shared split-screen layout + login, register, forgot-password, reset-password.

Work Log:
- Read existing API contract, validators, shared components, theme globals before writing.
- Created `src/components/shared/rotating-stat.tsx` (Framer Motion rotating institutional stats for the brand panel) and `src/components/shared/password-strength.tsx` (exports `scorePassword`, `<PasswordStrengthMeter>`, `<PasswordRequirements>` — reusable on voter/onboarding password screens).
- `src/app/(auth)/layout.tsx` — server component. Split-screen: LEFT hidden-on-mobile `bg-primary` emerald panel with `bg-grid` overlay (white variant), radial glow blobs, inline white brand mark, headline "Secure elections start here.", 3 trust bullets (LockKeyhole/ShieldCheck/Users), `<RotatingStat/>` at bottom. RIGHT: `<Logo/>` on mobile, centered form card with `animate-fade-in-up`, sticky footer (`mt-auto`).
- `src/app/(auth)/login/page.tsx` — Suspense-wrapped. react-hook-form + `zodResolver(loginSchema)`. Email + password (PasswordInput) with leading icons. Remember-me checkbox + Forgot password link. Loader2 spinner on submit. Redirect to `?next` (validated) or `/dashboard`. Destructive Alert + sonner toast on error. Collapsible "Demo accounts" with copy-to-clipboard for org owner (`demo@votewise.com.ng / Demo@1234`) and platform admin (`admin@votewise.com.ng / Admin@12345`). "Quick fill" button fills owner creds and submits in one click. Link to `/register`.
- `src/app/(auth)/register/page.tsx` — Full name, work email, password (PasswordInput + live `<PasswordStrengthMeter>` + `<PasswordRequirements>` checklist), organization name. POST `/api/auth/register` → redirect `/dashboard`. Destructive Alert + toast on error. Terms small print. Link to `/login`.
- `src/app/(auth)/forgot-password/page.tsx` — Email field, POST `/api/auth/forgot-password`. Always shows success state ("If an account exists…") for anti-enumeration. In non-production, surfaces `devResetUrl` in a `warning`-colored Alert with clickable link → `/reset-password?token=…`. Back-to-login link.
- `src/app/(auth)/reset-password/page.tsx` — Suspense-wrapped. Reads `?token=`. No token → dedicated "Invalid reset link" error card (Link2Off icon). Token present → new password (PasswordInput + strength meter) + confirm password + match validation (zod refine). POST `/api/auth/reset-password` with `{token,password,confirmPassword}`. On success → success card with "Continue to login" button → `/login`; form is replaced (can't resubmit). Backend `INVALID_TOKEN` surfaced in destructive Alert.
- All forms use shadcn `<Form>` wrapper + zod schemas imported from `@/lib/validators` (no duplication).
- `useSearchParams` usage wrapped in `<Suspense>` with skeleton fallback in both login & reset-password pages.

Stage Summary:
- All 4 routes return HTTP 200 on the running dev server.
- `bun run lint` on auth files: 0 errors. (2 pre-existing errors in `src/services/voter.service.ts` from Task 1 are NOT in my files.)
- Fixed one runtime bug during dev: lucide-react exports `Link2Off` (not `LinkOff`).
- Demo flow: login → Quick fill → instant org-owner sign-in → `/dashboard`. Forgot-password → submit → dev hint with clickable reset link → reset-password → success → back to login. All working end-to-end.

## Files added (for downstream reference)
- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/components/shared/rotating-stat.tsx` (reusable client component)
- `src/components/shared/password-strength.tsx` (reusable `scorePassword`, `<PasswordStrengthMeter>`, `<PasswordRequirements>`)
- `agent-ctx/5-auth-pages.md` (detailed work record)

---

Task ID: 4
Agent: Frontend / Marketing
Task: Public marketing pages — landing page (`/`) and pricing page (`/pricing`), plus shared `SiteHeader` & `SiteFooter` components.

Work Log:
- Read shared worklog, `@/lib/constants` (SUBSCRIPTION_PLANS, PRICING_CONFIG), `@/lib/utils` (formatCurrency/formatNumber/cn), `globals.css` premium helpers (bg-grid, bg-radial-fade, text-gradient, pulse-dot, shadow-glow, animate-fade-in-up), and existing shared `<Logo>`, `<StatusBadge>`, `<StatCard>`, `ThemeToggle`.
- Created `src/components/shared/reveal.tsx` — client Framer Motion `whileInView` fade-in-up wrapper, gated by `useReducedMotion` (returns plain div when reduced motion is on; no hydration risk).
- Created `src/components/shared/site-header.tsx` — client component. Sticky, backdrop-blur, `<Logo size="md">` left, desktop nav (Features / How it works / Security / Pricing / FAQ) with smooth `scrollIntoView` for hash links (route links go through `<Link>`), `ThemeToggle`, ghost `Sign In` → /login, primary `Get Started` → /register. Mobile: shadcn `Sheet` (right) with stacked nav + CTA buttons via `SheetClose asChild`.
- Created `src/components/shared/site-footer.tsx` — server component, `mt-auto`, 6-col grid: brand block + tagline + 5 social icons (lucide), then 4 link columns (Product / Company / Resources / Legal). Bottom row: copyright + "Demo credentials: admin@votewise.com.ng" linking to /login.
- `src/app/page.tsx` (server component) overwrote the placeholder with all 13 sections in order: (1) Hero — bg-grid + bg-radial-fade, eyebrow badge with pulse-dot, `text-gradient` headline, dual CTA, 3 trust stats, and a mock "Election Command Center" preview card (div-built, `<StatusBadge status="LIVE">`, turnout/votes/remaining tiles, 12-bar mini chart, 3 candidate progress bars) wrapped in `<Reveal delay={0.15}>`; (2) Use-cases strip — 8 pills; (3) Why Votewise — 6 feature cards (ShieldCheck/Vote/BarChart3/Users/Lock/Zap) each with hover shadow; (4) How it works — 4 numbered steps with desktop connecting line; (5) Security — emerald `bg-primary` panel, 2-col layout with copy + 6-item security checklist (Fingerprint/FileCheck2/EyeOff/ScrollText/TimerReset/ShieldAlert); (6) Real-time monitoring — 4 stat tiles + faux live "votes per minute" chart (15 bars) + system-health strip; (7) Analytics preview — results card "Departmental Class Rep Election 2024" with 4 candidates, progress bars, ballot-hash-verified footer; (8) Testimonials — 3 quote cards (Unilag, Lagos Chamber of Commerce, Nnamdi Azikiwe University); (9) Pricing preview — 3 plans (Starter/Professional/Enterprise) from SUBSCRIPTION_PLANS with "Most popular" badge on Professional, "See full pricing" link to /pricing; (10) FAQ — shadcn Accordion with 6 Q&As (privacy, verification, audit, bulk pricing, channels, data residency); (11) Final CTA — gradient emerald panel with grid overlay; (12) shared `<SiteFooter>`. All sections use `scroll-mt-24` so smooth-scroll clears the sticky header. Reusable `SectionHeading` helper handles eyebrow/title/description.
- `src/app/pricing/page.tsx` (server component) with metadata title "Pricing": (a) Hero — bg-grid + bg-radial-fade, Breadcrumb (Home / Pricing), H1, subtitle, emerald savings note; (b) 4 plan cards (FREE/STARTER/PROFESSIONAL/ENTERPRISE) from SUBSCRIPTION_PLANS, formatted via `formatCurrency` with `-1` → "Custom" and `0` → "Free", PROFESSIONAL highlighted "Most popular" with shadow-glow, CTA → /register; (c) Per-voter pricing explainer — 2-col with copy + a "Cost calculator (example)" card showing ₦400 standard × 2000 + ₦300 bulk × 3000 = ₦1,700,000, with savings vs ₦2,000,000; pulls rates from PRICING_CONFIG; (d) Election activation flow — 4 steps (Settings2/Wallet/CreditCard/Rocket) with connecting line; (e) Comparison table — 14 rows × 4 plans using shadcn Table, Check/X icons, Professional column tinted `bg-primary/5`; (f) Pricing FAQ — 6 Q&As in Accordion; (g) Final CTA gradient panel; shared `<SiteFooter>`.
- No `Math.random()` / `Date.now()` in client-rendered output; all mock numbers are static. SiteFooter's `new Date().getFullYear()` lives in a server component so SSR HTML === hydration HTML (no mismatch).
- Verified both routes return HTTP 200; grep-confirmed all section headings render in the served HTML.

Stage Summary:
- `/` and `/pricing` both return 200, compile cleanly, and render all sections.
- `bun run lint` on my 5 files: 0 errors. (2 pre-existing errors remain in `src/services/voter.service.ts` from Task 1 — not in my scope, untouched.)
- Institutional emerald theme throughout; no indigo/blue. Mobile-first, responsive 360→1440px+, sticky footer (`min-h-screen flex flex-col` + `mt-auto`), semantic landmarks (`header`/`main`/`footer`/`section`/`nav`), ARIA labels on icon-only buttons, visible focus rings, reduced-motion gating on all Framer Motion.
- Shared `<SiteHeader>` + `<SiteFooter>` are reusable by any future public route.

## Files added (for downstream reference)
- `src/components/shared/reveal.tsx` (client Framer Motion `whileInView` wrapper, reduced-motion aware)
- `src/components/shared/site-header.tsx` (client, sticky, smooth-scroll nav + mobile Sheet)
- `src/components/shared/site-footer.tsx` (server, 4 link columns + socials + demo-credential hint)
- `src/app/page.tsx` (landing, server component rendering client sub-components)
- `src/app/pricing/page.tsx` (pricing, server component with Accordion + Table client islands)
- `agent-ctx/4-marketing-pages.md` (detailed work record)

---

Task ID: 7
Agent: Frontend / Voter & Results
Task: Public voter experience (landing, OTP, ballot, receipt) + public results + public ballot verification.

Work Log:
- Read shared worklog (API contract for `POST /api/voter/verify`, `POST /api/voter/vote`, `POST /api/voter/vote/cast`, `POST /api/public/verify-ballot`, `GET /api/public/results/[id]`) + existing shared components (`<Logo>`, `<StatusBadge>`, `<Reveal>`), `@/lib/utils` (formatNumber, formatPercent, formatDate, maskEmail, maskPhone, initials, truncate, cn), `apiFetch` helper, theme globals.
- Created `src/components/shared/voter-progress.tsx` — reusable client `<VoterProgress current="verify|vote|confirm|receipt" />` 4-step horizontal strip with check icons for done steps, animated counters and connecting progress bars (gated by `useReducedMotion`).
- Created `src/app/(voter)/layout.tsx` — server layout for all voter routes: top-centered `<Logo size="lg" />` (linked to `/`), subtle emerald `bg-radial-fade` glow, "Secure election platform" trust pill, max-w-2xl content, sticky minimal footer (`mt-auto`).
- `src/app/(voter)/vote/[id]/page.tsx` — election landing. Fetches `GET /api/public/results/[id]` for election name + status. Hero (`<Logo>` from layout, `<StatusBadge>`, election name, instructions). Lookup card with single Input accepting voter ID/email/phone/matric. Submit → `POST /api/voter/verify {electionId, voterId}` (no code). Handles `{alreadyVoted:true}` (redirect to receipt with `?alreadyVoted=1`), `{sent:false}` (rate-limited message), `{sent:true, voterId, channel, devCode}` (persist `voterId` to sessionStorage, redirect to `/vote/[id]/verify?voterId=&channel=`). Non-LIVE status states: "Voting opens soon" (SCHEDULED/READY), "Voting has closed" (CLOSED/RESULTS_REVIEW/ARCHIVED), "Results are public → View results" (PUBLISHED, links to `/results/[id]`). "How voting works" 4-step strip + trust strip.
- `src/app/(voter)/vote/[id]/verify/page.tsx` — OTP. Reads `voterId` from query or sessionStorage, redirects to landing if missing. On mount, calls `POST /api/voter/verify {electionId, voterId}` (no code) to (re)send OTP — captures `channel` + `devCode` into state. Uses shadcn `<InputOTP>` with `<InputOTPGroup>` × 2 + `<InputOTPSeparator>` for 6 digits, large `size-12 text-lg` slots, `autoFocus`, `inputMode="numeric"`. Verify button → `POST /api/voter/verify {electionId, voterId, code}` → on `{verified:true}` redirect to `/vote/[id]/ballot?voterId=`; on error show destructive Alert + horizontal shake animation (Framer Motion `x: [0,-8,8,-6,6,-3,0]`, gated by `useReducedMotion`). "Resend code" button with 60s `setInterval` countdown, cleared on unmount. DEV HINT box (gated by `process.env.NODE_ENV !== 'production'` AND `devCode` present) — amber-styled Alert with the code in large monospace + Copy button, clearly labeled "Dev mode".
- `src/app/(voter)/vote/[id]/ballot/page.tsx` — The Ballot. `POST /api/voter/vote {voterId, electionId}` → `{session, ballot}` or `{alreadyVoted:true}`. `ELECTION_NOT_LIVE` / `INELIGIBLE` / already-voted handled as fatal cards (already-voted auto-redirects to receipt after 1.2s). For each position: card with title + description + "Choose 1"/"Choose up to N" Badge. `maxChoices===1` → `<RadioGroup>` + `<RadioGroupItem>` wrapped in clickable `<label htmlFor>` cards. `maxChoices>1` → `<Checkbox>` per candidate with max-enforcement via toast.warning. Candidate row: avatar (photo or initials) + name + manifesto snippet (truncated 140) + selected-state styling (border-primary, bg-primary/5, CheckCircle2). Sticky review bar at bottom (`fixed inset-x-0 bottom-0 backdrop-blur`) with "{answered}/{required} positions" + "Review selection" button (disabled until all required positions answered). Review Dialog lists each position + chosen candidate (or "No selection"), privacy note, "Confirm & cast vote" → `POST /api/voter/vote/cast {voterId, electionId, sessionId, votes}` → on success clean up sessionStorage (session + voter) and redirect to `/vote/[id]/receipt?reference=&count=`. Error mapping: FORBIDDEN/"session"/"verified" → back to landing; "already" → receipt with alreadyVoted. Load-error card has "Try again" button driven by `retryNonce` state counter.
- `src/app/(voter)/vote/[id]/receipt/page.tsx` — Receipt. Reads `reference`, `alreadyVoted`, `count` from query. `alreadyVoted=1` → amber hero with Info icon and "You have already voted" headline + one-voter-one-ballot alert. Otherwise: green CheckCircle hero, "Your vote has been recorded", big dashed-border reference box (monospace, break-all, primary color), Copy button (clipboard + sonner toast), "Verify your ballot" link to `/verify-ballot?reference=…`. Privacy explainer card (Anonymous ballot / Receipt only confirms receipt / Tamper-evident). Actions: "View election results" → `/results/[id]`, "Done" → `/`. Timestamp footer.
- `src/app/(voter)/results/[id]/page.tsx` — Public Results. `GET /api/public/results/[id]`. Published: hero (election name + description + StatusBadge), 3 stat tiles (Total votes cast / Turnout % with eligible-voters hint / Positions count), action bar (Tamper-evident + Share button using `navigator.share` with clipboard fallback + "Verify a ballot" link), per-position Card with ranked candidate rows (rank circle, avatar, name + Winner/Tied badge, vote count + percentage, Progress bar) and outcome footer (winner declared / tie at top / no votes). LIVE status shows amber "Live results — partial tally" alert. Unpublished: state card with status-aware copy ("Voting in progress" / "Results being tallied" / "Voting opens soon" / "Results are not yet public") + link to `/vote/[id]`.
- `src/app/(public)/verify-ballot/page.tsx` — Public receipt verification. Input for reference (Search icon, large monospace input). Auto-submits on mount if `?reference=` is present. `POST /api/public/verify-ballot {reference}` → result card: green CheckCircle "Ballot verified" (with reference + timestamp + privacy note) or red XCircle "Reference not found". "Lost your reference?" helper card. Back-to-home link.
- Modified `src/lib/tenant.ts` — added `"/verify-ballot"` to `PUBLIC_ROUTES` so the public receipt-verification page is reachable without a session (matches the existing `/vote`, `/results` exemptions in `src/proxy.ts`).
- All pages are `"use client"` (interactivity + fetch) and wrap `useSearchParams`/`useParams` usage in `<Suspense>` with Skeleton fallbacks (Next 16 build requirement).
- Design system: institutional emerald throughout (`bg-primary`, `text-primary`, `bg-secondary/30`, `border-primary/30`, success/amber for outcome states). NO indigo/blue anywhere. Mobile-first single-column max-w-2xl, generous spacing, large tap targets (size-12 inputs/buttons, size-8 step dots, size-14 hero icons). Sticky footer via root `min-h-screen flex flex-col` + footer `mt-auto` in shared layout. `<Logo />` top-centered on all voter pages. Framer Motion for entrance + step transitions, all gated by `useReducedMotion`. Toasts via `sonner`. Loading + error + empty states everywhere. Accessibility: `<Label htmlFor>` pairs, `aria-label`s on icon-only controls, `sr-only` descriptions, semantic landmarks, `aria-current="step"` on progress, `role="alert"` on Alerts.

Stage Summary:
- `bun run lint` on all 8 files I own: **0 errors, 0 warnings**. (Two pre-existing issues remain in `src/components/dashboard/{create-election-dialog,election-shell}.tsx` from another agent's task — not in my scope, untouched.)
- Voter flow: landing → lookup → OTP (with dev hint for QA) → ballot → review dialog → cast → receipt. Every step has loading/error/empty states. Already-voted is handled at all three pre-cast checkpoints (verify, vote, ballot).
- Public results: rich ranked bars with winner/tie detection + share + verify-ballot CTA when published; calm "not yet public" state when unpublished (status-aware copy).
- Verify-ballot page auto-submits when referenced from the receipt page (`?reference=…`), with verified / not-verified result cards.
- All API integrations use the documented contract from the worklog. The verify API returns `channel` only (not the masked recipient) — I display "Code sent via email/phone" using the channel label + appropriate icon, intentionally not surfacing any PII.
- The `devCode` returned by the API is shown ONLY when `process.env.NODE_ENV !== 'production'`. In production builds the dev hint box is omitted entirely.

## Files added / modified (for downstream reference)
- `src/app/(voter)/layout.tsx` (new — shared voter layout)
- `src/app/(voter)/vote/[id]/page.tsx` (new — landing + lookup)
- `src/app/(voter)/vote/[id]/verify/page.tsx` (new — OTP)
- `src/app/(voter)/vote/[id]/ballot/page.tsx` (new — ballot)
- `src/app/(voter)/vote/[id]/receipt/page.tsx` (new — receipt)
- `src/app/(voter)/results/[id]/page.tsx` (new — public results)
- `src/app/(public)/verify-ballot/page.tsx` (new — public receipt verification)
- `src/components/shared/voter-progress.tsx` (new — reusable client progress strip)
- `src/lib/tenant.ts` (modified — added `/verify-ballot` to PUBLIC_ROUTES)
- `agent-ctx/7-voter-results-pages.md` (detailed work record)

---

Task ID: 6
Agent: Frontend / Organization Admin Dashboard
Task: Organization admin dashboard — app shell, overview, elections list, election command center (Overview / Positions / Candidates / Voters / Results / Activate), and shared dashboard components.

Work Log:
- Read worklog fully (auth model, API contract, shared components, design system, status flow). Audited the existing dashboard scaffold laid down by Task 1 — `src/app/dashboard/**`, `src/components/dashboard/**`, `src/lib/{api-fetch,utils,constants,session,tenant}.ts`, plus `src/components/shared/{logo,status-badge,stat-card,theme-toggle,password-input}.tsx`.
- Verified every dashboard route and component is wired to the documented API contract using `apiFetch` from `@/lib/api-fetch`. End-to-end pass against the running dev server with the demo org owner account:
  - `GET /dashboard` → 200 (overview: 6 StatCards from `/api/admin/stats`, active-elections grid, election-health panel, recent-audit list, quick-actions)
  - `GET /dashboard/elections` → 200 (filter tabs All/Active/Draft/Concluded, ElectionCard grid, CreateElectionDialog)
  - `GET /dashboard/elections/[id]` → 200 (command center header with inline-edit, LifecycleControl, tabbed sub-nav)
  - All 5 sub-tabs (`/positions`, `/candidates`, `/voters`, `/results`, `/activate`) → 200
  - All backing API endpoints (`/api/elections`, `/api/elections/[id]`, `/analytics`, `/audit`, `/positions`, `/candidates`, `/voters`, `/results`, `/activation`, `/notifications`, `/api/admin/stats`, `/api/auth/me`) return `success: true`
  - Mutation flows verified by curl: create election → create position → import voters (preview → import) → fetch activation → pay → results. Each returned the documented response shape.
- **Critical foundation fix (out of strict scope but blocking)**: `POST /api/auth/login` was filtering `db.user.findFirst({ where: { email, organizationId: null } })` — i.e. only platform admins could sign in. Org owners have `organizationId` set after the seed attaches them to their org, so the demo login (`demo@votewise.com.ng / Demo@1234`) was returning 401 UNAUTHORIZED, making the entire dashboard unreachable via the documented credentials. Removed the `organizationId: null` filter so org owners can sign in. The password hash is still verified; this is purely a query bug fix. Register route has the same filter on its "existing" check but is non-blocking (register still works for new emails), so left untouched.
- **Dev-server recovery**: After `bun run db:push` recreated `db/custom.db`, the running dev server held a stale Prisma connection that reported `SQLITE_READONLY` on writes. Restarted the dev server via `setsid bash -c 'cd /home/z/my-project && exec bun run dev'` (fully detached, survived shell exit). Dev server is back on :3000, login + dashboard + APIs all green.
- Layout (`src/app/dashboard/layout.tsx`) — client component. `GET /api/auth/me` → if no user, `router.replace('/login?next=/dashboard')`. While loading, renders `<DashboardSkeleton/>`. Root `flex min-h-screen flex-col bg-background`; `<DashboardShell>` provides desktop sidebar (w-64, sticky, custom divs — NOT the scaffold's complex `<Sidebar>`), mobile Sheet sidebar, topbar (hamburger, page title, `<ThemeToggle/>`, notifications bell with unread count from `/api/notifications`, user dropdown with avatar initials + name + role + Settings + Sign-out → `POST /api/auth/logout` → `/login`), and a sticky `mt-auto` footer "© 2025 Votewise · Secure election infrastructure".
- Sidebar (`app-sidebar.tsx`) — Logo, "Create election" primary button (opens `CreateElectionDialog` via shell), nav list (Overview, Elections, Support, Audit Log, Security, Users, Subscription, Notifications, Settings) with `bg-sidebar-accent` on active item, lucide icons (LayoutDashboard/Vote/LifeBuoy/ScrollText/ShieldCheck/UserCog/CreditCard/Bell/Settings), Tooltip wrappers, "coming soon" badge on the Voters placeholder, and a bottom org card (Building2 icon + name + `/{slug}` + tier badge). PLATFORM_ADMIN role gets an extra "Platform Admin" → `/dashboard/commercial` nav block.
- Topbar (`app-topbar.tsx`) — sticky, backdrop-blur, hamburger (mobile → Sheet), page-title resolver (`/dashboard` → "Overview", `/dashboard/elections/*` → "Election Command Center", etc.), notifications bell (anim-ping dot when unread), `<ThemeToggle/>`, user dropdown (avatar initials + name + role label; Settings + Profile + destructive Sign-out).
- Overview page — greeting "Welcome back, {firstName}" + org name + tier badge; 6 StatCards (Active Elections, Total Voters, Candidates, Votes Cast, Pending Tickets, Security Alerts with critical hint + trend); Quick actions card (Create / Import / Results / Support); Active elections grid (`<ElectionCard>` filtered to LIVE/SCHEDULED/READY); Election-health side panel (turnout progress per active election, custom-scrollable); Recent activity (recentAudit list with action labels + `formatRelative`).
- Elections list — H1 + "New election" → `<CreateElectionDialog>`; client filter tabs (All/Active/Draft/Concluded) with per-tab counts; responsive `<ElectionCard>` grid; empty states per filter.
- `<CreateElectionDialog>` — name, description, type Select (GENERAL/FACULTY/DEPARTMENT/EXECUTIVE/CONFIDENCE/BALLOT_MEASURE), start/end datetime-local, timezone; POST `/api/elections`; handles `limitExceeded:true` with a destructive Alert + upgrade link to `/dashboard/subscription`.
- `<ElectionCard>` — type eyebrow, name, `<StatusBadge>`, voter/candidate/vote tiles, turnout Progress, time-range with `formatDate` + `timeUntil`, status-aware action button (Configure/Schedule/Open/Monitor/Resume/Review/Publish/View results), LIVE border highlight.
- Command Center (`election-shell.tsx`) — header card with type badge, `<StatusBadge>`, inline-edit name/description Dialog (PATCH `/api/elections/[id]`), time range + countdown badges (LIVE/SCHEDULED), and `<LifecycleControl>` mounted below. Tab strip with the 6 tabs (Overview/Positions/Candidates/Voters/Results/Activate) using `<Link>` for full URLs (proper browser history, shareable).
- `<LifecycleControl>` — current-status badge (with emerald `pulse-dot` for LIVE), iterates `VALID_STATUS_TRANSITIONS[currentStatus]` to render next-transition buttons (icons: ArrowRight/Flag/Play/Pause/Lock/CheckCircle2/Archive). AlertDialog confirmation for destructive targets (CLOSED, ARCHIVED, PUBLISHED). POST `/api/elections/[id]/status {status}`. When API returns `activationRequired:true`, surfaces a Dialog that routes to the Activate tab.
- Overview tab — 6 StatCards (Registered, Verified, Votes cast, Active sessions, Turnout %, Verification %); countdown strip (Start/End/Timezone); Vote-timeline mini-chart (`<VoteTimeline>` div bars from `analytics.timeline` with hover tooltips); Audit-log scroll list. Skeleton + ErrorState fallbacks.
- Positions tab — list cards (GripVertical, #order, title, max-choices badge, candidate & vote counts, edit/delete icon buttons); Add/Edit Dialog (title, description, maxChoices Select 1–5); AlertDialog delete confirmation. CRUD via `/api/elections/[id]/positions` and `/positions/[positionId]`.
- Candidates tab — responsive card grid (avatar initials, name, position, manifesto snippet via `truncate`, vote count, hover-revealed edit/delete); Add/Edit Dialog (name, position Select, bio, manifesto); AlertDialog delete confirmation. CRUD via `/api/elections/[id]/candidates` and `/candidates/[candidateId]`. Empty state when no positions yet — prompts to create a position first.
- Voters tab — summary pills (Total / Eligible / Ineligible); debounced search Input; `<VoterImportDialog>` (CSV/XLSX upload → preview stats table + errors → confirm → import summary); voters table inside `ScrollArea max-h-[60vh] scroll-area-custom` with columns Name, Matric, Department, masked Email/Phone (`maskEmail`/`maskPhone`), and a `<Switch>` to toggle eligibility (POST `/api/elections/[id]/voters {id,eligible}`). "Template" button generates a CSV client-side (Blob + download).
- Results tab — turnout summary card (eligible / cast / Progress bar); per-position ranked cards using `<PositionResultsCard>` (Crown for winner, "Tied — no winner" badge, vote count + percentage + Progress, winner highlight). Publish button (AlertDialog confirmation) → POST `/api/elections/[id]/results/publish`. Empty states for no positions / no votes. PUBLISHED badge + Globe icon when already published.
- Activate tab — pricing summary card (voters, rate, total `formatCurrency`, pricing rule, savings hint); action panel with `<Tabs>` (Pay & activate / Request negotiation); Pay flow → AlertDialog confirm → POST `/api/elections/[id]/activation/pay` → success card with receipt reference. Negotiation form (contactName, contactEmail, contactPhone, proposedAmount, message) → POST `/api/elections/[id]/activation/negotiate` → success state. Already-activated state shows green banner with activatedAt. Status badge maps 9 activation states to colored badges.
- Skeletons (`dashboard-skeleton.tsx`) — `StatCardSkeleton`, `ElectionCardSkeleton`, `TableRowSkeleton`, `DashboardSkeleton` (full-page layout skeleton for auth-check), `ErrorState` (with retry), `EmptyState` (icon + title + description + optional action).
- All pages: `"use client"`, `apiFetch` for every call, framer-motion subtle transitions (gated to keep things smooth), sonner toasts on every mutation, loading skeletons, error Alerts with retry, empty states. Institutional emerald throughout — `bg-primary`, `text-primary`, `bg-primary/10` accents, `border-primary/30`. NO indigo/blue introduced by this task (note: shared `status-badge.tsx` from Task 1 still uses `indigo` for the SCHEDULED state — out of scope, untouched). Mobile-first: sidebar collapses to `<Sheet>` on `<lg`, tables hide secondary columns on small screens, grids reflow `sm:grid-cols-2 lg:grid-cols-3`, sticky footer (`mt-auto`) respects viewport.

Stage Summary:
- `bun run lint` on all files in scope: **0 errors, 0 warnings**. (One transient warning had appeared in `src/app/dashboard/settings/page.tsx` — that file is NOT in this task's scope; re-running lint shows it has cleared.)
- Demo flow end-to-end verified: `POST /api/auth/login {demo@votewise.com.ng, Demo@1234}` → 200 + cookie → `GET /dashboard` → 200 (overview renders, /api/admin/stats returns 3 elections, 20 voters, 9 candidates, 6 votes, 1 pending ticket) → `GET /dashboard/elections` → 200 (3 ElectionCards) → `GET /dashboard/elections/{id}` → 200 (command center) → all 5 sub-tabs → 200 → mutation flows (create, position, voter import preview + import, activation pay) → all 200 success.
- Dashboard routes that exist as nav destinations but are NOT in this task's scope (and were left as Task 1 left them): `/dashboard/support`, `/dashboard/audit`, `/dashboard/security`, `/dashboard/users`, `/dashboard/subscription`, `/dashboard/notifications`, `/dashboard/settings`, `/dashboard/commercial`. They are reachable from the sidebar without 404s.

## Files in scope (already present from Task 1 foundation, verified + polished by Task 6)
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/elections/page.tsx`
- `src/app/dashboard/elections/[id]/page.tsx`
- `src/app/dashboard/elections/[id]/positions/page.tsx`
- `src/app/dashboard/elections/[id]/candidates/page.tsx`
- `src/app/dashboard/elections/[id]/voters/page.tsx`
- `src/app/dashboard/elections/[id]/results/page.tsx`
- `src/app/dashboard/elections/[id]/activate/page.tsx`
- `src/components/dashboard/app-sidebar.tsx`
- `src/components/dashboard/app-topbar.tsx`
- `src/components/dashboard/dashboard-shell.tsx`
- `src/components/dashboard/dashboard-skeleton.tsx`
- `src/components/dashboard/nav-config.ts`
- `src/components/dashboard/types.ts`
- `src/components/dashboard/election-card.tsx`
- `src/components/dashboard/election-shell.tsx`
- `src/components/dashboard/create-election-dialog.tsx`
- `src/components/dashboard/lifecycle-control.tsx`
- `src/components/dashboard/voter-import-dialog.tsx`
- `src/components/dashboard/results-bar.tsx`
- `src/components/dashboard/vote-timeline.tsx`

## Files modified (out of strict scope but blocking the demo login)
- `src/app/api/auth/login/route.ts` — removed the `organizationId: null` filter on the user lookup so org owners (who have organizationId set after seed attaches them to their org) can sign in. Single-line query fix; password verification unchanged.

## Files added
- `agent-ctx/6-dashboard.md` (this work record)

---

Task ID: 8
Agent: Frontend / Secondary Dashboard Pages
Task: Secondary organization dashboard pages — support inbox + ticket detail, audit log explorer, security events, members, settings & branding, notifications, subscription & billing, platform-admin negotiations review.

Work Log:
- Read shared worklog (Task 1 + 4 + 5 + 7), `prisma/schema.prisma` (enums for TicketStatus / TicketPriority / NotificationType / NotificationStatus / SecurityEventType / Severity / NegotiationStatus / AuditAction / Role), `@/lib/constants` (SUBSCRIPTION_PLANS, PRICING_CONFIG), `@/lib/utils`, `apiFetch`, `@/components/shared/{status-badge,stat-card,logo}`, `@/components/dashboard/{dashboard-skeleton,types,nav-config,dashboard-shell}` and existing API routes (`/api/support*`, `/api/admin/*`, `/api/notifications/*`, `/api/elections/[id]/audit`, `/api/auth/me`) before writing any code.
- Built 2 shared components and 9 dashboard pages. Files live under `src/app/dashboard/` (existing dashboard route group — the shell layout already serves `/dashboard/<page>` URLs that `nav-config.ts` references; `(dashboard)` was used loosely in the brief).
- Shared components:
  - `src/components/dashboard/page-header.tsx` — `<PageHeader eyebrow title description actions />` with subtle Framer Motion fade-in-up entrance. Reused on every page.
  - `src/components/dashboard/colored-badge.tsx` — `<ColoredBadge value tone pulse />` plus tone maps for `TICKET_STATUS_TONE`, `TICKET_PRIORITY_TONE`, `NOTIFICATION_STATUS_TONE`, `SECURITY_SEVERITY_TONE`, `NEGOTIATION_STATUS_TONE`, `ROLE_TONE`. Tone palette: neutral / primary / success / warning / danger / info (teal). NO indigo/blue. Used everywhere `<StatusBadge>` (election statuses only) doesn't fit.
- Pages:
  1. `support/page.tsx` — ticket list with filter tabs (All / Open / In progress / Waiting / Resolved / Closed, each with live count). Clickable rows navigate to detail. "New ticket" Dialog (subject, description, priority Select LOW/MEDIUM/HIGH/URGENT) → POST `/api/support`. Loading skeletons, error state, empty state with CTA.
  2. `support/[id]/page.tsx` — ticket header (subject, status changer Select, priority + status badges, created-by with avatar, assignee with avatar, description). Chat-like ScrollArea thread (`max-h-[55vh] scroll-area-custom`) with sender name + role badge + relative time; internal messages styled with amber lock + tinted background. Reply composer (Textarea + Send) → POST `/api/support/[id]/messages {body, isInternal}`. Internal-note checkbox gated to admin roles (PLATFORM_ADMIN / ORG_OWNER / ORG_ADMIN / ELECTION_MANAGER); non-admins see disabled checkbox + helper copy + ShieldAlert explainer. Auto-scrolls to newest message.
  3. `audit/page.tsx` — `GET /api/admin/stats` for `recentAudit` (org-wide) and `GET /api/elections` for the election selector; selecting an election loads `GET /api/elections/[id]/audit` (last 100). Filters: search (actor/resource/result/resourceId), action-type Select (built dynamically from the visible data), election selector. Table: timestamp (formatDate + formatRelative), actor (name + email), action (humanized via `AUDIT_ACTION_LABELS` map + raw enum), resource + truncated resource ID, result with tone, IP. Export CSV button builds a Blob client-side and downloads `votewise-audit-YYYY-MM-DD.csv`.
  4. `security/page.tsx` — `GET /api/admin/security` for events, `GET /api/admin/stats` for `{total, unresolved, critical}` totals. Top StatCards (Total / Unresolved with trend / Critical). Filters: severity Select + resolved-state Select. Table: severity `<ColoredBadge>`, humanized type + details, detected (formatRelative), IP, resolved Switch → PATCH `/api/admin/security {id}`. Resolved events cannot be re-opened from this view (Switch disabled + Tooltip explaining); stat count updates optimistically.
  5. `users/page.tsx` — `GET /api/admin/users`. Table: avatar (initials) + name + "You" badge on self, email, role Select (PATCH `/api/admin/users/[id] {role}`) — PLATFORM_ADMIN renders as a fixed pulsing badge (no demotion path here), last login (formatRelative), active Switch (PATCH `{isActive}`). Guard: own row has disabled Switch + Tooltip "You cannot deactivate your own account"; role Select also disabled for self.
  6. `settings/page.tsx` — `GET /api/auth/me` for `organization`. Subscription tier card (plan label, voter/election limits, "Manage plan" link to `/dashboard/subscription`). Profile form: logo URL with live `<img>` preview + initials fallback, name, contact info, description, branding JSON Textarea clearly marked "Demo". On submit: client-side optimistic update + `toast.success("Settings saved (demo)")` with description "Connect a PATCH /api/organization route to persist changes." Danger zone with disabled "Leave organization" / "Delete account" buttons (lock icons) + AlertDialog that surfaces the lock on confirm. Plain-language note about contacting platform admin.
  7. `notifications/page.tsx` — `GET /api/notifications`. Filters: search, status Select (QUEUED/SENT/DELIVERED/FAILED/RETRIED), channel Select (EMAIL/SMS/WHATSAPP/IN_APP). Table: type icon (Mail/MessageSquare/Smartphone/AppWindow), recipient, subject + body preview (truncate 110), status `<ColoredBadge>`, sent/delivered time (formatRelative), "Mark read" action → POST `/api/notifications/[id]/read` (updates local state to DELIVERED). "Mark all read" batch action iterates QUEUED/SENT. Unread rows subtly tinted.
  8. `subscription/page.tsx` — `GET /api/admin/subscription` (may be null) and `GET /api/auth/me` for tier. Current plan card: tier (large), ACTIVE/INACTIVE pulse badge, start/end dates, paymentRef, plan limits checklist. Per-voter pricing explainer card with standard/bulk/currency tiles + worked example for 5,000 voters (`PRICING_CONFIG` standardRate × bulkThreshold + bulkRate × remainder). Plan comparison: 4 SUBSCRIPTION_PLANS cards with "Most popular" (Professional) + "Current" badges, Upgrade buttons (POST `/api/admin/subscription/upgrade {tier}`), Enterprise → "Contact sales" mailto. Payment history table (`subscription.payments`) with reference/amount/status badge/date. Cancel-confirmation AlertDialog (POST `/api/admin/subscription/cancel`) with destructive action button.
  9. `commercial/page.tsx` — Guard: fetches `GET /api/auth/me`; if `user.role !== 'PLATFORM_ADMIN'`, shows `<EmptyState>` "Access restricted to platform administrators" with "Switch account" CTA. Otherwise: 4 top StatCards (Total / Pending / Approved / Declined), table of negotiations (org with icon, election, voter count, standard price, proposed/negotiated amount, status badge, contact email+phone, requested relative time). Click row → right Sheet drawer with summary tiles (voters/standard/proposed/status), contact card (mailto + tel links), customer message card, status Select (UNDER_REVIEW/IN_PROGRESS/SETTLEMENT_PENDING/SETTLED/APPROVED/DECLINED), negotiated amount Input, internal notes Textarea, assigned-to read-only display, Save button → PATCH `/api/admin/negotiations/[id] {status, negotiatedAmount?, internalNotes?, assignedToId?}`. Optimistic state updates + sonner toast.
- Design conformance: institutional emerald throughout (`bg-primary`, `text-primary`, `bg-primary/10`, `border-primary/30`, emerald success tones, amber warning, red destructive, teal info). NO indigo/blue. Framer Motion for subtle entrance animations on page headers, cards, table rows. shadcn primitives throughout (Button, Card, Input, Label, Select, Tabs, Table, Dialog, AlertDialog, Sheet, Switch, Checkbox, ScrollArea, Separator, Tooltip, Badge, Skeleton, Textarea). Sticky footer provided by the existing dashboard shell; pages render with `flex-1` wrapper. Loading skeletons (StatCardSkeleton, row skeletons, full-page Skeleton stacks), error states with retry, empty states with icon + description + contextual action. Fully responsive: tables hide non-essential columns at md/lg/xl breakpoints; filter grids collapse on mobile; Sheet drawer adapts width. Accessibility: `Label htmlFor` pairs, `aria-label`s on icon-only controls and Switches, semantic landmarks, `role="alert"` on Alerts, sr-only Sheet/Dialog descriptions, keyboard-navigable Selects and Dialogs.
- `bun run lint` (run from project root): **0 errors, 0 warnings** for all 11 files in this task. One initial warning (unused `@next/next/no-img-element` directive in `settings/page.tsx`) was removed.
- Runtime: logged in as `demo@votewise.com.ng` and confirmed every route compiles cleanly and returns HTTP 200 with no warnings/errors in `dev.log`. Also confirmed `GET /api/admin/negotiations` returns `{negotiations:[]}` (empty) when called by `admin@votewise.com.ng / Admin@12345` (platform admin) — the guard renders the "Access restricted" state for the demo org-owner user and would render the full table for a platform admin.
- Did NOT touch the dashboard layout, elections pages, APIs, or services — those are owned by another agent.

Stage Summary:
- All 9 secondary dashboard pages render inside the existing `src/app/dashboard/layout.tsx` shell. They share `PageHeader` + `ColoredBadge` so visual style stays consistent across the dashboard.
- Every page is `"use client"` (interactivity + fetch) and uses `apiFetch` exclusively. Loading skeletons, error + toast, and empty states everywhere.
- Settings page is intentionally marked "demo" — no PATCH endpoint exists in the API surface per the worklog, so submit is optimistic + toast. Per-voter pricing and plan limits are pulled from `@/lib/constants` so they stay in sync with the marketing pricing page (Task 4).
- Commercial page correctly guards against non-platform-admin users — the demo org-owner (`demo@votewise.com.ng`) sees the restricted state; only `admin@votewise.com.ng` would see the negotiations table.

## Files added (for downstream reference)
- `src/components/dashboard/page-header.tsx`
- `src/components/dashboard/colored-badge.tsx`
- `src/app/dashboard/support/page.tsx`
- `src/app/dashboard/support/[id]/page.tsx`
- `src/app/dashboard/audit/page.tsx`
- `src/app/dashboard/security/page.tsx`
- `src/app/dashboard/users/page.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/app/dashboard/notifications/page.tsx`
- `src/app/dashboard/subscription/page.tsx`
- `src/app/dashboard/commercial/page.tsx`
- `agent-ctx/8-secondary-dashboard-pages.md` (detailed work record)

---
Task ID: 9 + 10 + 11 (orchestrator closeout)
Agent: Lead (orchestrator)
Task: Realtime monitor mini-service, end-to-end verification & fixes, cron job.

Work Log:
- Built `mini-services/monitor-service` (independent bun project, port 3003): socket.io server using `bun:sqlite` read-only against the shared Prisma DB. On `subscribe:election {electionId}` it emits `election:stats` (voters, verified, votes, active sessions, turnout, verification rate) + `election:feed` (recent vote buckets, voter-anonymous) immediately and every 3s. Started with `bun run dev` (bun --hot).
- Added `src/components/dashboard/live-monitor-badge.tsx` exporting `useElectionLiveStats(electionId)` hook (connects via `io("/?XTransformPort=3003")`) and `<LiveMonitorBadge electionId status />`. Injected into `election-shell.tsx` header beside the StatusBadge for LIVE/SCHEDULED/READY/PAUSED elections — shows a pulsing "Live" radio badge + real-time vote count, active sessions, verified/voters. Gracefully shows "Connecting" when the socket is not reachable (e.g. direct localhost); connects live through the preview gateway.
- Installed `socket.io-client` in the main app.
- End-to-end verification with agent-browser (golden path): landing (/) → Sign In → quick-fill login (demo@votewise.com.ng) → /dashboard overview (6 StatCards, active elections, quick actions) → election command center (tabs + lifecycle controls + live badge) → voter flow: /vote/{id} lookup (voter1@unizik.edu.ng) → /verify (devCode OTP) → /ballot (select candidates per position) → review dialog → cast vote → /receipt with verification reference VOTEREC_... → public /results/{publishedId} (turnout 75%, tied results shown) → /verify-ballot?reference=... (ballot verified). All routes returned HTTP 200, no runtime errors.
- Bugs found & fixed during verification:
  1. Login API filtered `where: { email, organizationId: null }` — blocked org owners (who have organizationId set post-registration). Fixed by removing the filter (now finds by email). [fixed by Task 6 agent]
  2. Voter verify page (`(voter)/vote/[id]/verify/page.tsx`): initial `sending=true` + silent mount resend never cleared it (setSending(false) was inside `if(!silent)`), so the OTP InputOTP never rendered. Fixed by always calling `setSending(false)` after the send resolves. Re-verified: OTP input now renders, code fills, verify succeeds.
- Ran `bun run lint` — 0 errors, 0 warnings across the whole project.
- Created scheduled cron job (webDevReview, every 15 min, tz Africa/Lagos, job_id 324564, priority high) for continuous review/QA/feature enhancement.

Stage Summary:
- Votewise is fully functional end-to-end: multi-tenant org admin dashboard, election lifecycle command center, voter OTP verification, atomic ballot casting with anonymous tokens + ballot hashing + receipts, server-side results engine, audit logging, security events, support tickets, subscription/billing (simulated server-verified), per-voter pricing + activation + negotiation, platform-admin negotiations review, public results + ballot verification, and real-time monitoring via socket.io mini-service.
- Demo data seeded: 3 elections (LIVE Student Union Gov, SCHEDULED Faculty draft, PUBLISHED Dept Class Rep with votes), 12 voters, audit logs, security events, support ticket, PROFESSIONAL subscription.
- Files of note: prisma/schema.prisma, prisma/seed.ts, src/lib/{session,constants,errors,api-response,rate-limit,tenant,validators,utils,db,email-templates,api-fetch}.ts, src/services/* (16 services), src/app/api/** (~40 routes), src/proxy.ts, src/components/shared/*, src/components/dashboard/*, mini-services/monitor-service/index.ts.
- How to run: `bun run dev` (port 3000, Next.js) + `cd mini-services/monitor-service && bun run dev` (port 3003, socket.io). Both should run in background.
- Known limitations / next-phase recommendations:
  * No real SMS/email/WhatsApp provider — OTP is delivered via the in-app Notification log and surfaced as a devCode hint in non-production. Wire Resend/Termii when going live.
  * Payments are simulated & server-verified (no Paystack webhook). Add real webhook verification before production.
  * Realtime monitor uses in-process polling of SQLite; for very large elections, switch to Postgres + LISTEN/NOTIFY or a dedicated worker.
  * Multi-tenant subdomain resolution (`tenant.ts`) is implemented but single-port sandbox serves one org; enable subdomain routing in production.
  * Add automated tests (vitest) for vote.service, result.service, election transitions, otp.service.
  * Add MFA for admins, IP allow-listing, and structured log shipping to an observability platform.

---
Task ID: CRON-1 (webDevReview round 1)
Agent: Lead (orchestrator) — cron-triggered continuous review
Task: Assess project status, QA test via agent-browser, fix bugs, add new features, improve styling.

## Current Project Status Assessment
- Votewise is fully functional end-to-end. Both services (Next.js :3000 + socket.io monitor :3003) running cleanly.
- `bun run lint` passes with 0 errors, 0 warnings.
- No runtime errors in dev.log.
- All major flows verified: landing → auth → dashboard → election command center → voter flow (lookup → OTP → ballot → receipt) → public results → ballot verification.

## Bugs Found & Fixed
1. **Elections list missing vote counts** — `ElectionService.listForOrg` didn't include `votes` in `_count.select`, so all election cards showed "0 Votes" even for elections with votes. **Fixed**: added `votes: true` to the `_count.select` in `src/services/election.service.ts`. Verified: cards now show "6 Votes" (published) and "3 Votes" (LIVE).
2. **"Voters soon" disabled sidebar link** — the sidebar had a "coming soon" disabled Voters link pointing to `/dashboard/elections`. **Fixed**: created a proper `/dashboard/voters` cross-election voter directory page with search, filters, CSV export, and per-voter verified/voted status. Updated `nav-config.ts` to remove `comingSoon: true` and point to the new page.
3. **Election audit tab too noisy** — the audit API used `OR: [{ organizationId }, { resourceId: id }]` which pulled in ALL org events (including every "Signed in"). **Fixed**: rewrote `GET /api/elections/[id]/audit` to prioritize election-specific events (matching `resourceId` or known election-linked resources) and only include high-signal org events (ELECTION_CREATE, VOTE_CAST, RESULT_PUBLISHED, etc.) for context. Deduped by ID.

## New Features Added
1. **Cross-election Voters Directory** (`/dashboard/voters`):
   - New API: `GET /api/admin/voters?search=&electionId=&eligibility=` — returns all voters across the org with enriched `isVerified` + `hasVoted` status, election context, and verification/session counts.
   - Full page with: 4 StatCards (Total/Verified/Voted/Eligible), debounced search, election filter dropdown, eligibility filter, responsive table (avatar, voter name, election with status badge, department/level, masked email/phone, eligible/verified/voted indicators), CSV export, and "manage in election" quick-jump button per row.
   - Replaces the disabled "Voters soon" sidebar link.

2. **Command Palette (⌘K / Ctrl+K)**:
   - New component: `src/components/dashboard/command-palette.tsx` using shadcn `CommandDialog`.
   - Keyboard shortcut wired in `dashboard-shell.tsx` via `window.addEventListener("keydown")`.
   - Search bar button added to `app-topbar.tsx` with `⌘K` kbd hint.
   - Supports: all navigation pages, "Create New Election" action, platform-admin section (conditional), quick links (home, pricing), and "Sign out" account action.

3. **Results CSV Export**:
   - Added "Export CSV" button to the election results tab (`src/app/dashboard/elections/[id]/results/page.tsx`).
   - Generates a CSV with Position, Rank, Candidate, Votes, Percentage, Winner columns + summary rows (election name, total votes, total voters, turnout).
   - Triggers a browser download with a sanitized filename.

4. **Voter Demographic Analytics**:
   - Enhanced `GET /api/elections/[id]/analytics` to return a `demographics` object with `byFaculty`, `byDepartment`, `byLevel` breakdowns — each with total/verified/voted counts. No individual voter data exposed.
   - New component: `src/components/dashboard/demographics-panel.tsx` — renders a 3-column card with per-group progress bars (total width + voted overlay), turnout percentage, and "more" overflow indicator.
   - Injected into the election overview tab below the vote timeline + audit log grid.

## Styling Improvements
1. **Dashboard overview gradient header** — replaced the flat greeting with a gradient panel (`from-primary/10 via-accent/40 to-background`) with blurred decorative orbs and an "All systems operational" live pulse indicator.
2. **New CSS utility classes** in `globals.css`:
   - `glass-card` — backdrop-blur glass-morphism effect.
   - `shimmer` — animated loading shimmer.
   - `hover-lift` — translateY(-2px) + shadow on hover.
   - `gradient-border` — gradient border accent via mask compositing.
   - `glow-primary` — subtle primary-colored glow box-shadow.
   - Enhanced `*:focus-visible` outline.
3. **Election card hover-lift** — added `hover-lift` class to election cards for a subtle lift + shadow on hover. LIVE elections now get `glow-primary` for a premium active glow.

## Verification Results
- `bun run lint`: 0 errors, 0 warnings.
- agent-browser end-to-end:
  - ✅ Voters directory page loads with 20 voters, 2 verified, 1 voted.
  - ✅ Command palette opens with ⌘K, shows all nav items + actions.
  - ✅ Election cards show correct vote counts (6, 0, 3).
  - ✅ Demographics panel visible in election overview (Faculty/Department/Level breakdowns).
  - ✅ Results CSV export button visible on results tab.
  - ✅ Gradient header with "All systems operational" pulse on dashboard overview.
  - ✅ No console errors on any tested page.

## Files Modified/Created
- **Modified**: `src/services/election.service.ts` (votes count fix), `src/app/api/elections/[id]/audit/route.ts` (election-specific audit), `src/app/api/elections/[id]/analytics/route.ts` (demographics), `src/components/dashboard/nav-config.ts` (voters link enabled), `src/components/dashboard/dashboard-shell.tsx` (command palette + voters title), `src/components/dashboard/app-topbar.tsx` (search button), `src/app/dashboard/page.tsx` (gradient header), `src/app/dashboard/elections/[id]/page.tsx` (demographics panel), `src/app/dashboard/elections/[id]/results/page.tsx` (CSV export), `src/components/dashboard/election-card.tsx` (hover-lift), `src/app/globals.css` (new CSS utilities).
- **Created**: `src/app/api/admin/voters/route.ts`, `src/app/dashboard/voters/page.tsx`, `src/components/dashboard/command-palette.tsx`, `src/components/dashboard/demographics-panel.tsx`.

## Unresolved Issues / Risks / Next-Phase Recommendations
- **No real SMS/email/WhatsApp provider** — OTP delivered via in-app Notification log + devCode hint. Wire Resend/Termii for production.
- **Payments simulated** — no Paystack webhook. Add real webhook verification.
- **No automated tests** — recommend adding vitest for vote.service, result.service, election transitions, otp.service.
- **No MFA for admins** — recommend adding TOTP-based MFA for ORG_OWNER/ORG_ADMIN/PLATFORM_ADMIN roles.
- **Subdomain multi-tenancy** — `tenant.ts` resolution exists but single-port sandbox serves one org. Enable in production.
- **Observer management UI** — the schema supports Observers but there's no UI to assign/manage them per election. Recommend adding an Observers tab to the election command center.
- **Election duplication** — no "Duplicate election" feature to clone setup. Would speed up recurring elections.
- **Notification preferences** — admins can't configure which notifications they receive. Recommend a preferences panel in Settings.
- **Real-time dashboard** — the live monitor badge is in the election header, but the dashboard overview doesn't show real-time updates. Could add a live activity feed via socket.io.

---
Task ID: CRON-2 (webDevReview round 2)
Agent: Lead (orchestrator) — cron-triggered continuous review
Task: Assess project status, QA test via agent-browser, add new features, improve styling.

## Current Project Status Assessment
- Votewise is fully functional end-to-end. Both services (Next.js :3000 + socket.io monitor :3003) running cleanly.
- `bun run lint` passes with 0 errors, 0 warnings.
- No runtime errors in dev.log.
- All major flows verified: landing → auth → dashboard → election command center → voter flow → public results.

## Bugs Found & Fixed
- No bugs found during this round's QA. All flows from round 1 remain working correctly.

## New Features Added

### 1. Observer Management UI (election command center → Observers tab)
- **New API routes**: `GET/POST /api/elections/[id]/observers` (list + add observer) and `DELETE /api/elections/[id]/observers/[observerId]` (remove).
- **Observer add flow**: enter name + email → finds or creates an OBSERVER-role user in the org → creates an Observer record linked to the election. Prevents assigning existing admin-role users as observers (role conflict guard). Prevents duplicate observer assignments.
- **Observers page** (`/dashboard/elections/[id]/observers`): summary bar (observer count + read-only access badge), observer cards (avatar, name, email, last-seen, active/disabled badge, remove button with confirmation AlertDialog), empty state with "Add first observer" CTA, add-observer Dialog with privacy note.
- Added "Observers" tab to `ELECTION_TABS` in nav-config.ts.
- Verified: added "Dr. Emeka Obi" as observer to the LIVE election — appeared instantly in the list.

### 2. Election Duplication (one-click clone)
- **New API route**: `POST /api/elections/[id]/duplicate` — creates a new DRAFT election with "(Copy)" suffix, copies all positions + candidates (NOT voters/votes/sessions), moves to CONFIGURATION status. Uses a Prisma transaction for atomicity. Logs an audit event.
- **Duplicate button** added to every `<ElectionCard>` — a Copy icon button next to the main action button. Shows a loading spinner during duplication, then redirects to the new election.
- Verified: elections count went from 3 → 4 after clicking duplicate, redirected to the new election's command center. (Cleaned up the test duplicate afterward.)

### 3. Real-time Dashboard Activity Feed (socket.io)
- **Enhanced monitor service** (`mini-services/monitor-service/index.ts`): added `subscribe:org` / `unsubscribe:org` socket events. On subscription, emits `org:stats` (total voters, total votes, active/live elections, verified voters) and `org:activity` (merged feed of recent votes, verifications, and audit logs across the org — voter-anonymous). Broadcasts every 3 seconds.
- **New component**: `src/components/dashboard/live-activity-feed.tsx` — connects to the monitor via `io("/?XTransformPort=3003")`, subscribes to the org, displays a timeline-style activity feed with type-specific icons (vote=primary, verification=emerald, audit=amber, security=red). Shows "Live"/"Connecting" connection badge with pulse indicator.
- **HTTP fallback**: fetches initial activity from `/api/admin/stats` (recentAudit) so the feed has data even before the socket connects (works in direct localhost mode without the gateway).
- Injected into the dashboard overview sidebar alongside the (shortened) static recent-audit card.
- Verified: "Live activity" panel appears with audit log entries even in direct localhost mode (via HTTP fallback).

## Styling Improvements

### Voter landing page (`/vote/[id]`)
- **Hero**: upgraded to a gradient panel (`from-primary/5 via-accent/30 to-background`) with blurred decorative orbs (primary + chart-2 colors).
- **"How voting works" steps**: redesigned from a flat list to centered cards with numbered badges, ring-4 background cutouts, a connecting gradient line on desktop (`from-primary/20 via-primary/40 to-primary/20`), and hover-border-primary transition.
- **Trust strip**: upgraded from inline text to a bordered panel with pill-shaped badges on a muted background.

### Public results page (`/results/[id]`)
- **Hero**: upgraded to the same gradient panel style with blurred decorative orbs, matching the voter landing page for visual consistency.

### Dashboard overview
- Added the `<LiveActivityFeed>` component to the sidebar, replacing the old static "Recent activity" card (which was renamed to "Recent audit" and shortened to 6 items).

## Verification Results
- `bun run lint`: 0 errors, 0 warnings.
- agent-browser end-to-end:
  - ✅ Dashboard live activity feed visible with HTTP fallback data.
  - ✅ Dashboard gradient header with "All systems operational" pulse.
  - ✅ Observers tab renders in election command center.
  - ✅ Observer "Dr. Emeka Obi" successfully added and visible in the list.
  - ✅ Election duplication: 3 → 4 elections, redirected to new election.
  - ✅ Voter landing page enhanced hero + "How voting works" steps.
  - ✅ Public results gradient hero.
  - ✅ No console errors on any tested page.

## Files Modified/Created
- **Created**: `src/app/api/elections/[id]/observers/route.ts`, `src/app/api/elections/[id]/observers/[observerId]/route.ts`, `src/app/api/elections/[id]/duplicate/route.ts`, `src/app/dashboard/elections/[id]/observers/page.tsx`, `src/components/dashboard/live-activity-feed.tsx`.
- **Modified**: `src/components/dashboard/nav-config.ts` (Observers tab), `src/components/dashboard/election-card.tsx` (duplicate button), `src/components/dashboard/dashboard-shell.tsx` (voters title), `src/app/dashboard/page.tsx` (live activity feed + gradient header), `src/app/(voter)/vote/[id]/page.tsx` (gradient hero + enhanced steps + trust strip), `src/app/(voter)/results/[id]/page.tsx` (gradient hero), `mini-services/monitor-service/index.ts` (org activity broadcasting).

## Unresolved Issues / Risks / Next-Phase Recommendations
- **No real SMS/email/WhatsApp provider** — OTP delivered via in-app Notification log + devCode hint. Wire Resend/Termii for production.
- **Payments simulated** — no Paystack webhook. Add real webhook verification.
- **No automated tests** — recommend adding vitest for vote.service, result.service, election transitions, otp.service, and the new observer/duplicate APIs.
- **No MFA for admins** — recommend adding TOTP-based MFA for ORG_OWNER/ORG_ADMIN/PLATFORM_ADMIN roles.
- **Subdomain multi-tenancy** — `tenant.ts` resolution exists but single-port sandbox serves one org. Enable in production.
- **Observer access UI** — observers can be assigned but there's no dedicated observer-facing dashboard yet. Recommend building a read-only observer view at `/observe/[id]` showing turnout, verification rates, and (if permitted) live results.
- **Notification preferences** — admins can't configure which notifications they receive. Recommend a preferences panel in Settings.
- **Audit log filtering** — the audit page has basic filters but could benefit from date-range and actor-specific filtering.
- **Election templates** — could add pre-built election templates (e.g. "Student Union", "Board Election") to speed up setup.

---
Task ID: CRON-3 (webDevReview round 3)
Agent: Lead (orchestrator) — cron-triggered continuous review
Task: Assess project status, QA test via agent-browser, add new features, improve styling.

## Current Project Status Assessment
- Votewise is fully functional end-to-end. Both services (Next.js :3000 + socket.io monitor :3003) running cleanly.
- `bun run lint` passes with 0 errors, 0 warnings.
- No runtime errors in dev.log.
- All major flows verified: landing → auth → dashboard → election command center → voter flow → public results → observer view.

## Bugs Found & Fixed
- No bugs found during this round's QA. All flows from round 2 remain working correctly.
- Fixed a UI rendering issue in the template dialog (templates not loading on open) by switching from `onOpenChange` callback to a `useEffect` that triggers `loadTemplates` when `open` becomes true. Also replaced `ScrollArea` with a plain `overflow-y-auto` div for reliable rendering.

## New Features Added

### 1. Observer-Facing Dashboard (`/observe/[id]`)
- **New API**: `GET /api/public/observe/[id]` — returns read-only election health metrics (registered voters, verified, votes cast, active sessions, turnout, verification rate), a cumulative vote timeline, and (if PUBLISHED) final results. Never exposes voter identities or individual ballot choices.
- **New page**: `src/app/observe/[id]/page.tsx` — a premium public observer dashboard with:
  - Gradient hero panel with election name, organization, status badge, and live-monitoring pulse.
  - Observer notice card explaining the read-only, privacy-preserving nature.
  - 6 stat tiles (registered, verified, votes cast, active now, turnout, verification rate) with active-session highlighting.
  - Turnout overview card with progress bar.
  - Vote timeline chart (bar + cumulative overlay, per-hour buckets).
  - Published results section (ranked candidates with progress bars, winner highlight, tie detection) — only shown when PUBLISHED.
  - Auto-refresh every 10 seconds for near-live updates.
  - Share button to copy the observer link.
  - Trust footer with tamper-evident/read-only/auto-refresh badges.
- Added `/observe` to public routes in `tenant.ts` and `proxy.ts`.
- Added "Open observer view" link button on the observers management page (opens in new tab).

### 2. Election Templates (pre-built setups)
- **New API**: `GET /api/election-templates` (list 6 templates) + `POST /api/election-templates` (create election from template).
- **6 templates**: Student Union Government (5 positions, 10 candidates), Faculty Representatives, Class Representatives, Board of Directors (3 positions, 5 candidates), Association Executives (4 positions, 5 candidates), Confidence Vote.
- **New component**: `src/components/dashboard/template-dialog.tsx` — a dialog with template selection cards (icon, name, type badge, description, position/candidate counts), optional election name override, and create button. Loads templates via `useEffect` when opened.
- Added "Templates" button to the elections list page header alongside "New election".
- Verified: selected "Student Union Government" template → created election with 5 positions and 10 candidates, redirected to the new election's command center.

### 3. Notification Preferences (Settings)
- **New section** in the Settings page (`/dashboard/settings`): "Notification preferences" card with 5 event types (Election goes live, Vote cast, Election closed, Results published, Security alerts) × 3 channels (Email, SMS, WhatsApp) = 15 toggle switches.
- Each row has an icon, label, description, and per-channel `Switch` toggles styled as pill badges.
- "Save preferences" button with demo toast (preferences are client-side only; an API would persist them in production).
- Security alerts default to Email + SMS; other events default to Email only.

## Styling Improvements

### Auth layout (`(auth)/layout.tsx`)
- Added an "institution types" pill strip (Universities, Student Unions, Associations, Cooperatives, NGOs, Clubs) at the bottom of the left branded panel for additional visual richness and trust signaling.

### Observer dashboard
- Full premium design with gradient hero, blurred decorative orbs, stat tiles, timeline chart, and results cards — consistent with the institutional emerald theme.

## Verification Results
- `bun run lint`: 0 errors, 0 warnings.
- agent-browser end-to-end:
  - ✅ Observer view at `/observe/[id]` loads with 12 registered, 2 verified, 3 votes, 25% turnout, vote timeline.
  - ✅ Observer view auto-refreshes every 10 seconds (no errors).
  - ✅ "Open observer view" link visible on observers management page.
  - ✅ Templates dialog shows 6 templates with position/candidate counts.
  - ✅ Selected "Student Union Government" template → created election with 5 positions + 10 candidates.
  - ✅ Notification preferences section visible in Settings with all 5 event types and channel toggles.
  - ✅ Institution types pill strip on auth layout.
  - ✅ No console errors on any tested page.

## Files Modified/Created
- **Created**: `src/app/api/public/observe/[id]/route.ts`, `src/app/observe/[id]/page.tsx`, `src/app/api/election-templates/route.ts`, `src/components/dashboard/template-dialog.tsx`.
- **Modified**: `src/lib/tenant.ts` (+`/observe`, `/verify-ballot` to public routes), `src/proxy.ts` (+`/observe/` passthrough), `src/app/dashboard/elections/page.tsx` (Templates button + dialog), `src/app/dashboard/elections/[id]/observers/page.tsx` (Open observer view link), `src/app/dashboard/settings/page.tsx` (notification preferences section + ChannelToggle component), `src/app/(auth)/layout.tsx` (institution types pill strip).

## Unresolved Issues / Risks / Next-Phase Recommendations
- **No real SMS/email/WhatsApp provider** — OTP delivered via in-app Notification log + devCode hint. Wire Resend/Termii for production.
- **Payments simulated** — no Paystack webhook. Add real webhook verification.
- **No automated tests** — recommend adding vitest for vote.service, result.service, election transitions, otp.service, observer API, and template creation.
- **No MFA for admins** — recommend adding TOTP-based MFA for ORG_OWNER/ORG_ADMIN/PLATFORM_ADMIN roles.
- **Subdomain multi-tenancy** — `tenant.ts` resolution exists but single-port sandbox serves one org. Enable in production.
- **Notification preferences not persisted** — currently client-side only with a demo toast. Add a `PATCH /api/organization` endpoint to persist preferences in the org's `branding` JSON field.
- **Observer authentication** — the observer view is currently public (anyone with the link can view). For production, add a token-based observer authentication (e.g. signed observer links with expiry).
- **Audit log advanced filtering** — the audit page has basic filters; add date-range and actor-specific filtering.
- **Election scheduling automation** — elections must be transitioned to LIVE manually. Add automatic status transitions based on start/end times via a cron job.
- **Results export to PDF** — currently CSV only. Add PDF report generation for official result publication.

---
Task ID: CRON-4 (webDevReview round 4)
Agent: Lead (orchestrator) — cron-triggered continuous review
Task: Assess project status, QA test via agent-browser, add new features, improve styling.

## Current Project Status Assessment
- Votewise is fully functional end-to-end. Three services now running: Next.js (:3000), socket.io monitor (:3003), and the new election scheduler (background).
- `bun run lint` passes with 0 errors, 0 warnings.
- No runtime errors in dev.log.
- All major flows verified: landing → auth → dashboard → election command center → voter flow → public results → observer view → settings persistence.

## Bugs Found & Fixed
- No bugs found during this round's QA. All flows from round 3 remain working correctly.

## New Features Added

### 1. Organization Settings Persistence API
- **New API**: `GET /api/admin/organization` (fetch full org profile including description, contactInfo, branding) + `PATCH /api/admin/organization` (persist changes with zod validation + audit logging).
- **Settings page upgraded**: the `onSave` function now calls the real PATCH API instead of a demo toast. The `load` function fetches the full org profile via `GET /api/admin/organization` so all form fields (name, description, logo, contactInfo, branding) are populated from the database.
- Removed the "Demo" badge from the branding field (now shows "JSON" since it's a real persisted field).
- Verified: changed org name to "Nnamdi Azikiwe University (Updated)" → saved → reloaded page → name persisted → reverted via script.

### 2. Advanced Audit Log Filtering
- **New filters** added to the audit page (`/dashboard/audit`):
  - **Result filter** (Select): All results / Success / Failed / Cancelled / No result.
  - **Date range** (From / To date inputs): filters logs by timestamp range.
  - **Active filter counter**: shows "Clear filters (N)" button when any filter is active, plus a "N matches" badge.
- The filter UI was restructured from a 3-column grid to a 4-column grid (search + election + action + result) with a second row for date range and clear button.
- All filters compose with the existing search and action-type filters.

### 3. Election Scheduler (auto LIVE/CLOSED transitions)
- **New mini-service**: `mini-services/scheduler-service/index.ts` — an independent bun script that polls the SQLite database every 60 seconds and performs automatic status transitions:
  - `SCHEDULED → LIVE` when `startTime` has passed and `endTime` hasn't.
  - `LIVE → CLOSED` when `endTime` has passed.
  - `SCHEDULED → CLOSED` for missed-window elections (endTime passed without going live).
- Each transition logs an audit entry with `metadata: { automated: true, from, to }` and `userAgent: 'votewise-scheduler'` for traceability.
- Verified: on first run, the scheduler automatically closed the LIVE election whose endTime had passed (the Student Union Government Elections 2025 whose end time was set to 24h after start but the seed ran days ago).
- Started with `bun mini-services/scheduler-service/index.ts` (not `--hot` to avoid premature exit).

## Styling Improvements

### Voter receipt page (`/vote/[id]/receipt`)
- **Success hero**: upgraded from a flat centered layout to a gradient panel (`from-emerald-50 via-accent/40 to-background` with dark mode variants) with blurred decorative orbs (emerald + chart-2 colors).
- **Success icon**: now uses `shadow-glow` for a premium glow effect, with emerald-tinted colors for the success state and amber for the already-voted state.

## Verification Results
- `bun run lint`: 0 errors, 0 warnings.
- agent-browser end-to-end:
  - ✅ Settings page: changed org name → saved → reloaded → persisted.
  - ✅ Settings form fields (description, contactInfo, branding) now populate from the API.
  - ✅ Audit page: date range filters (From/To), result filter dropdown, active filter counter, clear button all visible.
  - ✅ Voter receipt: gradient success hero with glow effect.
  - ✅ Scheduler service: running in background, automatically closed an overdue LIVE election.
  - ✅ No console errors on any tested page.

## Files Modified/Created
- **Created**: `src/app/api/admin/organization/route.ts` (GET + PATCH), `mini-services/scheduler-service/index.ts` (+ `package.json`).
- **Modified**: `src/app/dashboard/settings/page.tsx` (real API persistence + OrgFullDTO type + removed Demo badge), `src/app/dashboard/audit/page.tsx` (date-range + result filters + clear button + active filter counter), `src/app/(voter)/vote/[id]/receipt/page.tsx` (gradient success hero).

## Unresolved Issues / Risks / Next-Phase Recommendations
- **No real SMS/email/WhatsApp provider** — OTP delivered via in-app Notification log + devCode hint. Wire Resend/Termii for production.
- **Payments simulated** — no Paystack webhook. Add real webhook verification.
- **No automated tests** — recommend adding vitest for vote.service, result.service, election transitions, otp.service, organization API, and scheduler logic.
- **No MFA for admins** — recommend adding TOTP-based MFA for ORG_OWNER/ORG_ADMIN/PLATFORM_ADMIN roles.
- **Subdomain multi-tenancy** — `tenant.ts` resolution exists but single-port sandbox serves one org. Enable in production.
- **Observer authentication** — the observer view is currently public (anyone with the link can view). For production, add token-based observer authentication with signed links and expiry.
- **Notification preferences not persisted** — the notification preferences section in Settings is still client-side only. Add persistence via the organization `branding` JSON field or a new `NotificationPreference` model.
- **PDF results export** — currently CSV only. Add PDF report generation for official result publication.
- **Election scheduler restart-on-reboot** — the scheduler runs as a background process; add it to a process manager or systemd for production reliability. Consider integrating it into the main Next.js app as a serverless cron or API route with a secret token.
- **Real-time election auto-transition notifications** — when the scheduler transitions an election to LIVE or CLOSED, it should trigger notifications to org admins. Currently it only logs to the audit table.

---
Task ID: CRON-5 (webDevReview round 5)
Agent: Lead (orchestrator) — cron-triggered continuous review
Task: Assess project status, QA test via agent-browser, add new features, improve styling.

## Current Project Status Assessment
- Votewise is fully functional end-to-end. Three services running: Next.js (:3000), socket.io monitor (:3003), and election scheduler (background).
- `bun run lint` passes with 0 errors, 0 warnings.
- No runtime errors in dev.log.
- All major flows verified: landing → auth → dashboard (with leaderboard) → election command center → voter flow → public results → observer view → settings (with persistence) → PDF report.
- The election scheduler correctly auto-closed the overdue LIVE election; re-activated it with a 48h end time for testing.

## Bugs Found & Fixed
- **PDF report page server-side error**: the report page was a Server Component with an `onClick` handler on the print button, which is not allowed in Next.js 16. Fixed by extracting the print button into a `<PrintButton />` client component.
- No other bugs found during QA.

## New Features Added

### 1. Notification Preferences Persistence
- **New API**: `GET /api/admin/notification-preferences` (fetch prefs from org's branding JSON) + `PATCH /api/admin/notification-preferences` (persist prefs with zod validation + audit logging). Preferences are stored in the organization's `branding` JSON field under a `notificationPreferences` key.
- **New component**: `src/components/dashboard/notification-preferences-card.tsx` — self-contained card that fetches preferences on mount, manages 5 event types × 3 channels = 15 toggle switches, and saves via PATCH API. Shows loading skeletons, saving spinner, and success toast.
- **Settings page upgraded**: replaced the demo-only inline notification preferences section (with `ChannelToggle` components and `NOTIFICATION_PREFS` constant) with the new `<NotificationPreferencesCard />` component. Removed all unused code (icons, Switch import, ChannelToggle function, NOTIFICATION_PREFS constant).
- Verified: toggled "Vote cast → Email" → saved → reloaded page → preference persisted (checked=true after reload).

### 2. PDF Results Export (Official Report)
- **New page**: `src/app/report/[id]/page.tsx` — a server-rendered, print-friendly official results report with:
  - Report header with Votewise logo, election name, org name, generation timestamp, and status.
  - Election details grid (type, start/end time, timezone).
  - Summary stats (eligible voters, votes cast, turnout, positions) with emerald-tinted stat tiles.
  - Per-position results table with rank medals, candidate names, vote counts, percentages, and progress bars. Winner highlighted with emerald background + trophy icon. Tied results flagged.
  - Footer with report ID, tamper-evidence note, and Votewise branding.
  - `@media print` styles for clean PDF output via browser's "Save as PDF".
  - `<PrintButton />` client component for the print action.
- Added `/report` to public routes in `tenant.ts` and `proxy.ts`.
- Added "PDF Report" button to the election results tab (next to "CSV" export).
- Verified: opened `/report/{publishedElectionId}` → full report rendered with all positions, candidates, vote counts, and winner highlights.

### 3. Voter Turnout Leaderboard (Engagement Metrics)
- **New API**: `GET /api/admin/engagement` — returns a leaderboard of elections sorted by turnout (only elections with voters), plus summary metrics (total voters, total votes, average turnout, elections with voters, active count, best election).
- **New component**: `src/components/dashboard/engagement-leaderboard.tsx` — premium card with:
  - Summary strip: 3 stat tiles (total voters, total votes, avg turnout) with icons.
  - Ranked leaderboard: medal icons (gold/silver/bronze) for top 3, numbered badges for the rest. Each row shows election name, status badge, voter/vote/position counts, turnout progress bar, and a hover arrow.
  - Scrollable list (max 24rem) with framer-motion staggered entrance.
  - Click any election to navigate to its command center.
- Injected into the dashboard overview below the active elections + side panels grid.
- Verified: "Turnout leaderboard" visible on dashboard with 2 ranked elections (75% and 25% turnout), summary stats (20 voters, 9 votes, 50% avg).

## Styling Improvements

### Candidate cards (election command center → Candidates tab)
- Added `hover-lift` class for a subtle translateY + shadow on hover.
- Enhanced the vote count badge: now shows as a pill badge with `bg-primary/10 text-primary` when votes exist, or muted text when zero. Displays "N votes" (with proper singular/plural).

## Verification Results
- `bun run lint`: 0 errors, 0 warnings.
- agent-browser end-to-end:
  - ✅ Notification preferences: loaded from API, toggled "Vote cast → Email", saved, persisted across page reload.
  - ✅ PDF report: `/report/{id}` renders full official report with header, stats, results table, winner highlights, and print button.
  - ✅ "PDF Report" button visible on results tab next to "CSV" export.
  - ✅ Turnout leaderboard visible on dashboard overview with 2 ranked elections, summary stats, medal icons, and turnout bars.
  - ✅ Candidate cards have hover-lift effect and enhanced vote count pills.
  - ✅ No console errors on any tested page.

## Files Modified/Created
- **Created**: `src/app/api/admin/notification-preferences/route.ts`, `src/components/dashboard/notification-preferences-card.tsx`, `src/app/api/admin/engagement/route.ts`, `src/components/dashboard/engagement-leaderboard.tsx`, `src/app/report/[id]/page.tsx`, `src/components/shared/print-button.tsx`.
- **Modified**: `src/app/dashboard/settings/page.tsx` (replaced inline prefs with `<NotificationPreferencesCard />`, removed unused code), `src/app/dashboard/page.tsx` (added `<EngagementLeaderboard />`), `src/app/dashboard/elections/[id]/results/page.tsx` (added PDF Report button + FileText icon), `src/app/dashboard/elections/[id]/candidates/page.tsx` (hover-lift + enhanced vote count pill), `src/lib/tenant.ts` (+`/report`), `src/proxy.ts` (+`/report/` passthrough).

## Unresolved Issues / Risks / Next-Phase Recommendations
- **No real SMS/email/WhatsApp provider** — OTP delivered via in-app Notification log + devCode hint. Wire Resend/Termii for production.
- **Payments simulated** — no Paystack webhook. Add real webhook verification.
- **No automated tests** — recommend adding vitest for vote.service, result.service, election transitions, otp.service, organization API, notification preferences API, and engagement API.
- **No MFA for admins** — recommend adding TOTP-based MFA for ORG_OWNER/ORG_ADMIN/PLATFORM_ADMIN roles.
- **Subdomain multi-tenancy** — `tenant.ts` resolution exists but single-port sandbox serves one org. Enable in production.
- **Observer authentication** — the observer view is currently public. Add token-based observer authentication with signed links and expiry.
- **Scheduler restart-on-reboot** — the scheduler runs as a background process; add it to a process manager or systemd for production reliability.
- **Real-time auto-transition notifications** — when the scheduler transitions an election to LIVE or CLOSED, it should trigger notifications to org admins based on the saved notification preferences.
- **Election comparison view** — could add a cross-election comparison page showing turnout trends over time.
- **Voter engagement scoring** — could add a per-voter engagement score (verified + voted + speed) for gamification.
- **Results certificate generation** — could add downloadable participation certificates for voters.

---
Task ID: CRON-6 (webDevReview round 6)
Agent: Lead (orchestrator) — cron-triggered continuous review
Task: Assess project status, QA test via agent-browser, add new features, improve styling.

## Current Project Status Assessment
- Votewise is fully functional end-to-end. Three services running: Next.js (:3000), socket.io monitor (:3003), election scheduler (background).
- `bun run lint` passes with 0 errors, 0 warnings.
- No runtime errors in dev.log.
- All major flows verified: landing → auth → dashboard (with leaderboard) → election command center → voter flow → public results → observer view → settings → PDF report → compare page → certificate.

## Bugs Found & Fixed
- No bugs found during this round's QA. All flows from round 5 remain working correctly.

## New Features Added

### 1. Election Comparison View (`/dashboard/compare`)
- **New API**: `GET /api/admin/compare` — returns all elections with computed metrics (turnout, voters, votes, positions, candidates), a trend array (elections with voters over time), type distribution, status distribution, and aggregate totals.
- **New page**: `src/app/dashboard/compare/page.tsx` — a premium analytics page with:
  - 4 StatCards (total elections, total voters, total votes, average turnout).
  - **Turnout trend chart**: animated bar chart with gradient bars, hover tooltips showing turnout/votes/voters, and framer-motion staggered entrance.
  - **Election types distribution**: progress bars with percentage breakdown by type (General, Faculty, Department, etc.).
  - **Status breakdown**: colored dot list with status counts.
  - **Detailed comparison table**: side-by-side metrics for every election with status badges, turnout progress bars, dates, and click-through navigation. Scrollable with sticky header.
- Added "Compare" to the sidebar nav (`nav-config.ts`), command palette, and dashboard shell title resolver.
- Verified: page loads with 3 elections, 50% avg turnout, trend chart showing 2 elections with voters, type distribution (33% each), and a detailed comparison table.

### 2. Voter Participation Certificate (`/certificate/[reference]`)
- **New page**: `src/app/certificate/[reference]/page.tsx` — a server-rendered, print-friendly certificate of participation with:
  - Premium bordered certificate design with decorative corner accents and a vote-icon watermark.
  - Votewise logo header with "CERTIFICATE OF PARTICIPATION" label.
  - Voter email, election name, organization name.
  - Verification reference in an emerald-tinted box with "Ballot received and recorded" confirmation.
  - Issue date and election ID footer.
  - Privacy note: "Ballot secrecy is preserved — individual vote choices are never linked to voter identity."
  - `@media print` styles for A4 landscape PDF output.
  - "Get certificate" button added to the voter receipt page (opens in new tab).
  - Not-found state for invalid references.
- Added `/certificate` to public routes in `tenant.ts` and `proxy.ts`.
- Verified: opened certificate with a real receipt reference → renders full certificate with voter email, election name, reference, and date.

### 3. Dashboard Quick-Search Enhancement
- The command palette (⌘K) already supports navigation. This round, added "Compare Elections" to the command palette's navigation items so it's discoverable via quick-search.

## Styling Improvements

### Positions tab (election command center → Positions)
- Position cards now have `hover-lift` class for subtle translateY + shadow on hover.
- Position icon: upgraded from muted background to `bg-primary/10 text-primary`.
- Max votes badge: upgraded to `border-primary/30 bg-primary/5 text-primary` for better visual emphasis.
- Candidate count badge: now uses `bg-primary/10 text-primary` when candidates exist, or muted when zero.
- Vote count badge: now uses `bg-emerald-500/10 text-emerald-600` when votes exist, or muted when zero — providing instant visual feedback on engagement.

### Voter receipt page
- Added "Get certificate" button (outline variant with Award icon) next to "Verify your ballot" — gives voters a tangible artifact of their participation.

## Verification Results
- `bun run lint`: 0 errors, 0 warnings.
- agent-browser end-to-end:
  - ✅ Compare page: loads with 3 elections, 50% avg turnout, trend chart, type/status distributions, and detailed comparison table.
  - ✅ Certificate: `/certificate/{reference}` renders full certificate with voter email, election name, reference, date, and privacy note.
  - ✅ "Get certificate" button visible on voter receipt page.
  - ✅ Positions tab: enhanced cards with hover-lift, primary-tinted icons and badges, emerald vote count pills.
  - ✅ "Compare" in sidebar nav and command palette.
  - ✅ No console errors on any tested page.

## Files Modified/Created
- **Created**: `src/app/api/admin/compare/route.ts`, `src/app/dashboard/compare/page.tsx`, `src/app/certificate/[reference]/page.tsx`.
- **Modified**: `src/components/dashboard/nav-config.ts` (+Compare with BarChart3 icon), `src/components/dashboard/dashboard-shell.tsx` (+Compare title), `src/components/dashboard/command-palette.tsx` (+Compare Elections + BarChart3 icon), `src/lib/tenant.ts` (+`/certificate`), `src/proxy.ts` (+`/certificate/` passthrough), `src/app/(voter)/vote/[id]/receipt/page.tsx` (+Get certificate button + Award icon), `src/app/dashboard/elections/[id]/positions/page.tsx` (hover-lift + enhanced badges/icons).

## Unresolved Issues / Risks / Next-Phase Recommendations
- **No real SMS/email/WhatsApp provider** — OTP delivered via in-app Notification log + devCode hint. Wire Resend/Termii for production.
- **Payments simulated** — no Paystack webhook. Add real webhook verification.
- **No automated tests** — recommend adding vitest for vote.service, result.service, election transitions, otp.service, compare API, and certificate page.
- **No MFA for admins** — recommend adding TOTP-based MFA for ORG_OWNER/ORG_ADMIN/PLATFORM_ADMIN roles.
- **Subdomain multi-tenancy** — `tenant.ts` resolution exists but single-port sandbox serves one org. Enable in production.
- **Observer authentication** — the observer view is currently public. Add token-based observer authentication with signed links and expiry.
- **Scheduler restart-on-reboot** — the scheduler runs as a background process; add it to a process manager or systemd for production reliability.
- **Real-time auto-transition notifications** — when the scheduler transitions an election, it should trigger notifications based on saved preferences.
- **Voter engagement scoring** — could add a per-voter engagement score (verified + voted + speed) for gamification.
- **Election comparison export** — could add CSV/PDF export of the comparison table for reporting.
- **Certificate verification API** — could add a public API to verify certificate authenticity by reference (currently the certificate page itself serves as verification).
- **Cross-election voter deduplication** — the same voter may participate in multiple elections; could add a unified voter identity view.

---
Task ID: CRON-7 (webDevReview round 7)
Agent: Lead (orchestrator) — cron-triggered continuous review
Task: Assess project status, QA test via agent-browser, add new features, improve styling.

## Current Project Status Assessment
- Votewise is fully functional end-to-end. Three services running: Next.js (:3000), socket.io monitor (:3003), election scheduler (background).
- `bun run lint` passes with 0 errors, 0 warnings.
- No runtime errors in dev.log.
- All major flows verified: landing → auth → dashboard (with leaderboard + engagement scoring) → election command center → voter flow → public results → observer view → settings → PDF report → compare (with CSV export) → certificate → verify-ballot (with certificate link).

## Bugs Found & Fixed
- No bugs found during this round's QA. All flows from round 6 remain working correctly.

## New Features Added

### 1. Voter Engagement Scoring (Gamification)
- **New API**: `GET /api/admin/engagement-scoring` — computes per-voter engagement scores:
  - Verified (OTP confirmed): +30 points
  - Voted (ballot cast): +50 points
  - Speed bonus (voted within 30 min of verification): +20 points
  - Returns a leaderboard (top 50), aggregate summary (total voters, verified, voted, avg score, top score, engagement rate), and score distribution buckets (No activity / Verified / Voted / Speed voter).
- **New component**: `src/components/dashboard/engagement-scoring-card.tsx` — premium card with:
  - 4-tile summary strip (voters, verified, voted, top score) with icons.
  - Score distribution progress bars (4 buckets).
  - Ranked leaderboard with medal emojis (🥇🥈🥉) for top 3, numbered badges for the rest.
  - Per-voter: tier icon (Speed Voter/Active Voter/Verified/Beginner), masked email, election name, verified/voted badges, score + tier label.
  - Scrollable list with framer-motion staggered entrance.
- Injected into the dashboard overview in a 2-column grid alongside the turnout leaderboard.
- Verified: shows 20 voters, 2 verified, 1 voted, 100 top score (Speed Voter), with gold/silver medals.

### 2. Election Comparison CSV Export
- Added `exportCsv` function to the compare page (`/dashboard/compare`) that generates a CSV with columns: Election, Status, Type, Voters, Votes, Positions, Candidates, Turnout %, Start/End Time + summary rows (totals, average turnout).
- "Export CSV" button added to the PageHeader actions area.
- Verified: "Export CSV" button visible on compare page.

### 3. Public Certificate Verification API
- **New API**: `POST /api/public/verify-certificate` — given a receipt reference, verifies ballot receipt and returns certificate-safe metadata (election name, org name, issue date, masked voter email). Never exposes voter identity or ballot choices.
- Added `/api/public/verify-certificate` to public routes in `tenant.ts`.
- Enhanced the public verify-ballot page: when a ballot is verified, a "View participation certificate" button appears that links to `/certificate/{reference}` in a new tab.
- Verified: "View participation certificate" link visible on verified ballot page.

## Styling Improvements

### Dashboard sidebar (org card)
- The organization card at the bottom of the sidebar is now a clickable link to `/dashboard/settings` (with `hover:border-primary/30 hover:shadow-sm` effect).
- Added a gradient background (`from-primary/5 via-background to-background`).
- Org icon now has `ring-1 ring-primary/10` and `group-hover:bg-primary/15` transition.
- Plan badge now includes a `Sparkles` icon for a premium feel.

## Verification Results
- `bun run lint`: 0 errors, 0 warnings.
- agent-browser end-to-end:
  - ✅ Engagement scoring: visible on dashboard with 20 voters, 2 verified, 1 voted, 100 top score, medals, tier labels, distribution bars.
  - ✅ Compare CSV export: "Export CSV" button visible on compare page.
  - ✅ Verify-ballot certificate link: "View participation certificate" button appears after ballot verification.
  - ✅ Sidebar org card: clickable, gradient, Sparkles icon in plan badge.
  - ✅ No console errors on any tested page.

## Files Modified/Created
- **Created**: `src/app/api/admin/engagement-scoring/route.ts`, `src/components/dashboard/engagement-scoring-card.tsx`, `src/app/api/public/verify-certificate/route.ts`.
- **Modified**: `src/app/dashboard/page.tsx` (added EngagementScoringCard in 2-col grid), `src/app/dashboard/compare/page.tsx` (CSV export function + Export CSV button + Download/Toast/Button imports), `src/app/(public)/verify-ballot/page.tsx` (+View participation certificate link + Award icon), `src/components/dashboard/app-sidebar.tsx` (clickable gradient org card + Sparkles icon), `src/lib/tenant.ts` (+`/api/public/verify-certificate`).

## Unresolved Issues / Risks / Next-Phase Recommendations
- **No real SMS/email/WhatsApp provider** — OTP delivered via in-app Notification log + devCode hint. Wire Resend/Termii for production.
- **Payments simulated** — no Paystack webhook. Add real webhook verification.
- **No automated tests** — recommend adding vitest for vote.service, result.service, election transitions, otp.service, engagement scoring API, compare API, and certificate verification API.
- **No MFA for admins** — recommend adding TOTP-based MFA for ORG_OWNER/ORG_ADMIN/PLATFORM_ADMIN roles.
- **Subdomain multi-tenancy** — `tenant.ts` resolution exists but single-port sandbox serves one org. Enable in production.
- **Observer authentication** — the observer view is currently public. Add token-based observer authentication with signed links and expiry.
- **Scheduler restart-on-reboot** — the scheduler runs as a background process; add it to a process manager or systemd for production reliability.
- **Real-time auto-transition notifications** — when the scheduler transitions an election, it should trigger notifications based on saved preferences.
- **Cross-election voter deduplication** — the same voter may participate in multiple elections; could add a unified voter identity view linking voters across elections by email/phone.
- **Engagement scoring history** — currently scores are computed on-the-fly; could persist historical scores over time to track engagement trends.
- **Leaderboard time-range filter** — could add a time-range selector (all-time / this month / this week) to the engagement leaderboard.
- **Certificate QR code** — could add a QR code to the certificate that links to the public verification page.
- **Comparison PDF export** — currently CSV only; could add a print-friendly PDF report for the comparison page.
