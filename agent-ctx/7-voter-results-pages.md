# Task 7 — Voter Experience & Public Results Pages

Agent: Frontend / Voter & Results
Task ID: 7
Scope: Public, no-session voter flow (`/vote/[id]/*`), public results (`/results/[id]`), and public ballot verification (`/verify-ballot`).

## What was built

### Routes (all `"use client"`, all wrapped in `<Suspense>` for `useSearchParams`/`useParams`)
1. **`src/app/(voter)/vote/[id]/page.tsx`** — Election landing + voter lookup
   - Fetches `GET /api/public/results/[id]` to surface election name + `<StatusBadge>`.
   - Hero with `<Logo size="lg" />` (via shared layout), election name, status badge, instruction copy.
   - Lookup card: single Input accepting voter ID / email / phone / matric number, Continue button.
   - On submit → `POST /api/voter/verify {electionId, voterId}` (no code).
     - `{alreadyVoted:true}` → redirect to receipt with `?alreadyVoted=1`.
     - `{sent:false}` → "Too many attempts" inline error + toast.
     - `{sent:true, voterId, channel, devCode}` → persist `voterId` (and channel) to `sessionStorage` under `votewise:voter:{electionId}` key, redirect to `/vote/[id]/verify?voterId=…&channel=…`.
   - Non-LIVE states: "Voting opens soon" (SCHEDULED/READY), "Voting has closed" (CLOSED/RESULTS_REVIEW/ARCHIVED), "Results are public → View results" (PUBLISHED).
   - "How voting works" 4-step strip (Verify → Vote → Confirm → Receipt).
   - Trust strip + sticky footer (via shared layout).

2. **`src/app/(voter)/vote/[id]/verify/page.tsx`** — OTP send + verify
   - Reads `voterId` from query (or `sessionStorage`). Missing → redirect back to landing.
   - On mount, (re)sends OTP via `POST /api/voter/verify {electionId, voterId}` (no code) so the page is self-sufficient for QA — captures `channel` + `devCode` into state.
   - shadcn `<InputOTP>` with 6 slots (2 groups of 3, separator) for the 6-digit code. `autoFocus`, `inputMode="numeric"`, large tap targets.
   - "Verify & continue" → `POST /api/voter/verify {electionId, voterId, code}`.
     - `{verified:true}` → redirect to `/vote/[id]/ballot?voterId=…`.
     - error → inline destructive Alert + horizontal shake animation (gated by `useReducedMotion`).
   - "Resend code" button with client-side 60s countdown (`setInterval`), cleared on unmount.
   - DEV HINT box (only when `process.env.NODE_ENV !== 'production'` AND a `devCode` is present) — amber-styled alert with the dev code in big monospace + Copy button. Clearly labeled "Dev mode — your verification code".
   - "Back" link to landing.
   - Channel icon (Mail/Smartphone) shown next to "Code sent via {email|phone}".

3. **`src/app/(voter)/vote/[id]/ballot/page.tsx`** — The Ballot
   - Reads `voterId` from query/sessionStorage.
   - `POST /api/voter/vote {voterId, electionId}` → `{session, ballot}` or `{alreadyVoted:true}`.
   - `ELECTION_NOT_LIVE`, `INELIGIBLE`, and `alreadyVoted` map to dedicated fatal cards (with redirect to receipt for already-voted).
   - `loadError` card has a "Try again" button driven by a `retryNonce` state counter (no fragile state mutation tricks).
   - For each position: card with title + description + "Choose 1" / "Choose up to N" badge, then candidate rows.
     - `maxChoices===1` → shadcn `<RadioGroup>` + `<RadioGroupItem>` wrapped in clickable `<label htmlFor>` cards.
     - `maxChoices>1` → shadcn `<Checkbox>` per candidate, enforces max via toast warning.
   - Candidate row: rank-less avatar (photo or initials), name, manifesto snippet (truncated to 140 chars), selected-state styling (border + bg-primary/5 + check icon).
   - Sticky review bar at bottom (fixed inset-x-0 bottom-0, backdrop-blur): "{answered}/{total} positions" + "Review selection" button (disabled until all required positions answered).
   - Review Dialog: lists each position + chosen candidate (or "No selection"), separator, privacy note, "Confirm & cast vote" button.
   - On confirm → `POST /api/voter/vote/cast {voterId, electionId, sessionId, votes}` → on success cleans up sessionStorage (session + voter) and redirects to `/vote/[id]/receipt?reference=…&count=…`.
   - Error mapping: `FORBIDDEN` + "session"/"verified" message → back to landing; "already" message → receipt with alreadyVoted.

4. **`src/app/(voter)/vote/[id]/receipt/page.tsx`** — Receipt
   - Reads `reference`, `alreadyVoted`, `count` from query.
   - If `alreadyVoted=1`: amber hero with Info icon and "You have already voted" headline + one-voter-one-ballot alert.
   - Otherwise: green CheckCircle hero, "Your vote has been recorded", big dashed-border reference box (monospace, break-all, primary color), Copy button (clipboard + sonner toast), "Verify your ballot" link to `/verify-ballot?reference=…`.
   - Privacy explainer card: Anonymous ballot / Receipt only confirms receipt / Tamper-evident (with icons).
   - Action buttons: "View election results" → `/results/[id]`, "Done" → `/`.
   - Timestamp footer.

5. **`src/app/(voter)/results/[id]/page.tsx`** — Public Results
   - `GET /api/public/results/[id]`.
   - **Published** (`{published:true, election, results}`):
     - Hero: election name + description + `<StatusBadge>`.
     - 3 stat tiles: Total votes cast, Turnout % (with eligible-voters hint), Positions count.
     - Action bar: "Tamper-evident · Independently auditable" + Share button (uses `navigator.share` if available, falls back to clipboard) + "Verify a ballot" link.
     - Per-position Card: title, description, total-vote count badge, ranked candidate rows (rank circle, avatar, name + Winner/Tied badge, vote count + percentage, Progress bar), outcome footer (winner declared / tie at top / no votes).
     - "Verify a ballot" CTA card at the bottom.
     - LIVE status shows an amber "Live results — partial tally" alert.
   - **Unpublished** (`{published:false, status, electionName, electionId}`):
     - Hero with status badge + election name.
     - State card: "Voting in progress" (LIVE — privacy-preserving, no live counts), "Results being tallied" (CLOSED/RESULTS_REVIEW), "Voting opens soon" (SCHEDULED/READY), "Results are not yet public" (others). Each with descriptive copy. Link to `/vote/[id]` if the user wants to go vote.

6. **`src/app/(public)/verify-ballot/page.tsx`** — Public Ballot Verification
   - Input for receipt reference (Search icon, large input, monospace).
   - Auto-submits on mount if `?reference=` query is present (e.g., arriving from the receipt page's "Verify your ballot" link).
   - `POST /api/public/verify-ballot {reference}` → result card with:
     - Verified (green CheckCircle, success-styled card) or Not found (red XCircle, destructive-styled card).
     - Reference (monospace, break-all) + Timestamp (formatted).
     - Privacy note for verified: "Verification confirms your ballot was received. It does not reveal who you voted for — your selections are stored anonymously."
   - "Lost your reference?" helper card explaining receipt was shown post-vote and cannot be recovered (privacy by design).
   - Back to home link.

### Shared components built
- **`src/components/shared/voter-progress.tsx`** — `<VoterProgress current="verify"|"vote"|"confirm"|"receipt" />`. 4-step horizontal progress with numbered circles, check icon for done steps, active step ring, animated counters (gated by `useReducedMotion`), connecting progress bars between steps that fill as you advance.
- **`src/app/(voter)/layout.tsx`** — Server layout for all voter routes. Top-centered `<Logo size="lg" />` linked to home, subtle radial emerald glow at top, "Secure election platform" trust pill, max-w-2xl centered content, sticky minimal footer (`mt-auto`) with copyright + "Tamper-evident ballots · End-to-end verification" line.

### Modifications to existing files
- **`src/lib/tenant.ts`** — Added `"/verify-ballot"` to `PUBLIC_ROUTES` so the public receipt-verification page is reachable without a session (matches the existing `/vote`, `/results` exemptions already in `src/proxy.ts`).

## Design system adherence
- Institutional emerald throughout — `bg-primary`, `text-primary`, `bg-secondary/30`, `border-primary/30`, success/amber for outcome states.
- NO indigo/blue anywhere.
- Mobile-first single-column, max-w-2xl, generous `space-y-6`, large tap targets (`size-12` inputs/buttons, `size-8` step dots, `size-14` hero icons).
- Sticky footer via root `min-h-screen flex flex-col` + footer `mt-auto` in the shared layout.
- `<Logo />` top-centered on all voter pages (via layout).
- Framer Motion for entrance + step transitions, all gated by `useReducedMotion` (returns static divs when reduced motion is preferred).
- Toasts via `sonner`.
- Loading + error + empty states everywhere (Skeletons, Alert cards, fallbacks).
- Suspense boundaries wrap every page that touches `useSearchParams` / `useParams` (Next 16 build requirement).
- Accessibility: `<Label htmlFor>` pairs, `aria-label`s on icon-only controls, `sr-only` descriptions, semantic `<header>`/`<main>`/`<footer>`/`<section>`/`<nav>`, `aria-current="step"` on progress, `role="alert"` on Alerts.

## API contract notes
- `POST /api/voter/verify` is called twice on the verify page (once on mount with no code to (re)send + capture `devCode`, once with `code` to verify). The rate-limit on the API side allows 5/min/IP — the resend countdown (60s client-side) keeps the user from burning through it.
- The verify API returns `channel` only (not the masked recipient). I display "Code sent via email/phone" using the channel label + appropriate icon (Mail/Smartphone), without surfacing PII — this is intentional and more privacy-preserving than returning a masked recipient would be.
- The `devCode` returned by the API is shown ONLY when `process.env.NODE_ENV !== 'production'`. In production builds the box is omitted entirely.
- Already-voted detection: the verify, vote, and ballot pages all handle `{alreadyVoted:true}` consistently and redirect to the receipt page with `?alreadyVoted=1`.

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

## Stage Summary
- `bun run lint` on all my files: **0 errors, 0 warnings**. (Two pre-existing issues remain in `src/components/dashboard/{create-election-dialog,election-shell}.tsx` from another agent's task — not in my scope, untouched.)
- Voter flow: landing → lookup → OTP (with dev hint for QA) → ballot → review dialog → cast → receipt. Every step has loading/error/empty states. Already-voted is handled at all three pre-cast checkpoints.
- Public results: rich ranked bars with winner/tie detection + share + verify-ballot CTA when published; calm "not yet public" state when unpublished (with status-aware copy).
- Verify-ballot page auto-submits when referenced from the receipt page, with verified / not-verified result cards.
- The dev server log shows clean compiles throughout — `bun run lint` confirms 0 errors in my files.
