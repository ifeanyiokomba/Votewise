# Task ID 8 — Secondary Organization Dashboard Pages

Agent: Frontend / Secondary Dashboard Pages
Task: Support inbox + ticket detail, audit log explorer, security events, organization members, settings & branding, notifications, subscription & billing, and platform-admin negotiations review.

## What was built

All pages live under `src/app/dashboard/` (the existing dashboard route group — Next.js convention uses parentheses only for true route groups without URL prefixes; the existing `dashboard/layout.tsx` shell already serves these URLs, so files were placed there to match the live `/dashboard/<page>` URLs already wired into `nav-config.ts`).

Shared components added:
- `src/components/dashboard/page-header.tsx` — Framer-Motion-aware page header (eyebrow + title + description + actions slot).
- `src/components/dashboard/colored-badge.tsx` — `ColoredBadge` plus tone maps for ticket status / priority, notification status, security severity, negotiation status, and user roles. Used wherever `<StatusBadge>` (election statuses only) doesn't fit. NO indigo/blue.

Pages delivered:
1. **`support/page.tsx`** — Ticket list with status filter tabs (All / Open / In progress / Waiting / Resolved / Closed) + counts. Table: subject, status badge, priority badge, assignee, message count, updated-at. "New ticket" dialog → POST `/api/support`. Clickable rows → `/dashboard/support/[id]`. Loading skeletons, error + empty states.
2. **`support/[id]/page.tsx`** — Ticket header (subject, status changer Select, priority + status badges, created by, assignee, description). Chat-like messages thread (`ScrollArea max-h-[55vh] scroll-area-custom`), sender name + role badge + time, internal messages styled distinctly with amber lock. Reply composer (Textarea + Send) → POST `/api/support/[id]/messages`. Internal-note checkbox gated to admin roles (PLATFORM_ADMIN / ORG_OWNER / ORG_ADMIN / ELECTION_MANAGER); non-admins see a disabled checkbox + helper copy.
3. **`audit/page.tsx`** — Top explainer. Filters: search (actor / resource / result), election selector (loads `GET /api/elections/[id]/audit` for full audit, otherwise `GET /api/admin/stats` `recentAudit`), action-type Select built dynamically from the visible data. Table: timestamp (formatDate + formatRelative), actor (name + email), action (humanized via `AUDIT_ACTION_LABELS`), resource + truncated resource ID, result with tone, IP. Export CSV button (client-side Blob download).
4. **`security/page.tsx`** — Top StatCards: Total events, Unresolved (trend), Critical. Filters: severity Select + resolved-state Select. Table: severity badge, humanized type + details, detected relative time, IP, resolved Switch (PATCH `/api/admin/security {id}`). Resolved events cannot be re-opened (disabled Switch).
5. **`users/page.tsx`** — Table: avatar + name, email, role (Select → PATCH `/api/admin/users/[id] {role}`; platform admins render as a fixed pulsing badge), last login (formatRelative), active Switch (PATCH `{isActive}`). Guard: cannot deactivate or change own role (Switch is locked with Tooltip explaining; "You" badge on own row).
6. **`settings/page.tsx`** — Subscription tier card showing current plan + limits. Profile form (logo URL with live preview, name, contact info, description, branding JSON marked "Demo"). Submit is optimistic + demo toast ("Settings saved (demo)") — no PATCH endpoint exists, so the page is clearly marked. Danger zone with disabled "Leave organization" / "Delete account" buttons + lock note + AlertDialog that confirms the action is locked.
7. **`notifications/page.tsx`** — Filters: search, status Select, channel Select. Table: type icon (Mail/MessageSquare/Smartphone/AppWindow), recipient, subject + body preview, status badge, sent time, "Mark read" action → POST `/api/notifications/[id]/read`. "Mark all read" batch action. Unread rows subtly tinted.
8. **`subscription/page.tsx`** — Current plan card (tier, active/inactive pulse badge, start/end dates, paymentRef, plan limits). Per-voter pricing explainer card (₦400 std / ₦300 bulk above 2000) with worked example. Plan comparison: 4 SUBSCRIPTION_PLANS cards with "Most popular" / "Current" badges, Upgrade buttons (POST `/api/admin/subscription/upgrade {tier}`), Enterprise → "Contact sales". Payment history table (subscription.payments). Cancel-confirmation AlertDialog (POST `/api/admin/subscription/cancel`).
9. **`commercial/page.tsx`** — PLATFORM_ADMIN guard: if `GET /api/auth/me` user.role !== 'PLATFORM_ADMIN', shows "Access restricted" EmptyState with switch-account CTA. Otherwise: top StatCards (Total / Pending / Approved / Declined), table of negotiations (org, election, voter count, standard price, proposed/negotiated amount, status badge, contact, requested). Click row → right Sheet drawer with summary tiles, contact card, customer message, status Select, negotiated amount Input, internal notes Textarea, and Save (PATCH `/api/admin/negotiations/[id]`).

## API contract used

- `GET/POST /api/support` — list tickets + create
- `GET/PATCH /api/support/[id]` — ticket detail + status change
- `GET/POST /api/support/[id]/messages` — messages thread + reply
- `GET /api/admin/stats` — recent audit, security totals
- `GET /api/elections` — for audit election selector
- `GET /api/elections/[id]/audit` — per-election audit log
- `GET /api/admin/security` + `PATCH` — security events + resolve
- `GET /api/admin/users` + `PATCH /api/admin/users/[id]` — list members + change role / active
- `GET /api/auth/me` — current user + organization
- `GET /api/notifications` + `POST /api/notifications/[id]/read`
- `GET /api/admin/subscription`, `POST .../upgrade`, `POST .../cancel`
- `GET /api/admin/negotiations` + `PATCH /api/admin/negotiations/[id]`

## Design conformance

- Institutional emerald throughout (`bg-primary`, `text-primary`, `bg-primary/10`, `border-primary/30`, etc.).
- No indigo/blue anywhere. ColoredBadge tone map uses neutral / primary / success / warning / danger / info (teal) only.
- Framer Motion: subtle fade-in-up entrance on page headers, cards, and table rows. No reduced-motion gating issues (transitions are decorative, not required for content).
- Sticky footer: provided by the dashboard shell; pages render with `flex-1` wrapper.
- Loading states: row skeletons, card skeletons, `StatCardSkeleton`, full-page Skeleton stacks.
- Error states: `ErrorState` with retry button; `sonner` toast for actionable failures.
- Empty states: `EmptyState` with icon + description + contextual action.
- Responsive: tables hide non-essential columns at `md`/`lg`/`xl` breakpoints; filter grids collapse; sheet drawer adapts width.
- Accessibility: `Label htmlFor` pairs, `aria-label`s on icon-only controls, semantic landmarks (`main`/`section`), `role="alert"` on Alerts, sr-only descriptions on Sheet/Dialog.

## Lint status

`bun run lint` (run from project root): **0 errors, 0 warnings** for all 9 page files + 2 shared components in this task. One warning (unused `@next/next/no-img-element` directive in `settings/page.tsx`) was removed.

## Runtime verification

Logged in as `demo@votewise.com.ng / Demo@1234` and exercised every route:

```
GET /dashboard/support          200 (compile 1698ms)
GET /dashboard/audit            200 (compile 677ms)
GET /dashboard/security         200 (compile 663ms)
GET /dashboard/users            200 (compile 653ms)
GET /dashboard/settings         200 (compile 711ms)
GET /dashboard/notifications    200 (compile 737ms)
GET /dashboard/subscription     200 (compile 623ms)
GET /dashboard/commercial       200 (compile 678ms)
GET /dashboard/support/[id]     200 (compile 1450ms)
GET /api/admin/negotiations     200 (as platform admin)
```

All routes compile cleanly with no warnings or errors in `dev.log`.

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
