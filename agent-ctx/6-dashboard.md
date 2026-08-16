# Task 6 — Organization Admin Dashboard (Agent: Frontend / Dashboard)

## Summary
Verified, polished and unblocked the organization admin dashboard for Votewise — the app shell (sidebar + topbar + sticky footer), overview page, elections list, and the tabbed election command center (Overview · Positions · Candidates · Voters · Results · Activate). All routes return 200 against the running dev server with the documented demo credentials, and every API endpoint used by the dashboard returns `success: true`.

## Files in scope (verified + polished)
Dashboard routes:
- `src/app/dashboard/layout.tsx` — client. Fetches `/api/auth/me`, redirects to `/login?next=/dashboard` if unauthenticated, renders `<DashboardSkeleton/>` while loading, wraps children in `<DashboardShell>`.
- `src/app/dashboard/page.tsx` — overview. Greeting + tier badge, 6 StatCards (Active Elections, Total Voters, Candidates, Votes Cast, Pending Tickets, Security Alerts), Quick actions card, Active elections grid, Election-health side panel, Recent activity (recentAudit).
- `src/app/dashboard/elections/page.tsx` — list. H1 + New election button → `<CreateElectionDialog>`. Filter tabs (All/Active/Draft/Concluded) with per-tab counts. Responsive grid of `<ElectionCard>`. Empty state.
- `src/app/dashboard/elections/[id]/page.tsx` — Command Center Overview tab. Header card via `<ElectionShell>`. Countdown strip, 6 StatCards (Registered, Verified, Votes cast, Active sessions, Turnout, Verification rate), Vote timeline mini-chart (`<VoteTimeline>`), Audit log list.
- `src/app/dashboard/elections/[id]/positions/page.tsx` — Positions tab. List + Add/Edit/Delete dialogs. CRUD via `/api/elections/[id]/positions` and `/positions/[positionId]`.
- `src/app/dashboard/elections/[id]/candidates/page.tsx` — Candidates tab. Card grid with avatar/initials + Add/Edit/Delete dialogs. CRUD via `/api/elections/[id]/candidates` and `/candidates/[candidateId]`.
- `src/app/dashboard/elections/[id]/voters/page.tsx` — Voters tab. Summary pills, debounced search, `<VoterImportDialog>` (preview + import), voters table in `ScrollArea max-h-[60vh]` with Switch for eligibility toggle.
- `src/app/dashboard/elections/[id]/results/page.tsx` — Results tab. Turnout summary, per-position ranked cards via `<PositionResultsCard>`, publish button with AlertDialog confirmation.
- `src/app/dashboard/elections/[id]/activate/page.tsx` — Activate tab. Pricing summary card, Tabs (Pay & activate / Request negotiation), payment AlertDialog, negotiation form, already-activated state banner.

Shared dashboard components:
- `src/components/dashboard/app-sidebar.tsx` — custom div-based sidebar (NOT the scaffold `<Sidebar>`). Logo, "Create election" primary button, nav list with `bg-sidebar-accent` active state, tooltips, org card at bottom with tier badge.
- `src/components/dashboard/app-topbar.tsx` — sticky backdrop-blur topbar. Hamburger (mobile→Sheet), page-title resolver, notifications bell with unread dot, `<ThemeToggle/>`, user dropdown (avatar initials + name + role + Sign-out → `/api/auth/logout`).
- `src/components/dashboard/dashboard-shell.tsx` — composes sidebar (desktop w-64 + mobile Sheet), topbar, and sticky footer (`mt-auto`, "© 2025 Votewise · Secure election infrastructure"). Mounts a single `<CreateElectionDialog>` for the sidebar's "Create election" button.
- `src/components/dashboard/dashboard-skeleton.tsx` — `StatCardSkeleton`, `ElectionCardSkeleton`, `TableRowSkeleton`, `DashboardSkeleton`, `ErrorState`, `EmptyState`.
- `src/components/dashboard/nav-config.ts` — `PRIMARY_NAV` (Overview, Elections, Voters [coming soon], Support, Audit Log, Security, Users, Subscription, Notifications, Settings), `PLATFORM_NAV` (Platform Admin → `/dashboard/commercial`), `ELECTION_TABS`.
- `src/components/dashboard/types.ts` — DTOs matching API response shapes.
- `src/components/dashboard/election-card.tsx` — type eyebrow, name, `<StatusBadge>`, voter/candidate/vote tiles, turnout progress, time range + countdown badges, status-aware action button.
- `src/components/dashboard/election-shell.tsx` — header card with inline-edit (PATCH `/api/elections/[id]`), `<LifecycleControl>`, tab strip using `<Link>`.
- `src/components/dashboard/create-election-dialog.tsx` — name/description/type/start/end/timezone form. POST `/api/elections`. Handles `limitExceeded` with upgrade prompt.
- `src/components/dashboard/lifecycle-control.tsx` — current-status badge (pulse-dot for LIVE), valid next-transition buttons from `VALID_STATUS_TRANSITIONS`, AlertDialog confirmation for CLOSE/ARCHIVE/PUBLISHED, activation-required Dialog routing to Activate tab.
- `src/components/dashboard/voter-import-dialog.tsx` — 3-stage flow: select file (drag/drop + template download) → preview (valid/duplicates/invalid tiles + sample table + errors) → import summary. Multipart POST to `/api/elections/[id]/voters/import` with `mode=preview|import`.
- `src/components/dashboard/results-bar.tsx` — `<ResultsBar>` (rank, avatar, vote count + percentage, Progress, Crown for winner) and `<PositionResultsCard>` (per-position ranked list with tie / no-votes states).
- `src/components/dashboard/vote-timeline.tsx` — div-bar timeline chart from `analytics.timeline` with hover tooltips.

## Critical foundation fix (out of strict scope but blocking)
- `src/app/api/auth/login/route.ts` — removed `organizationId: null` filter on the user lookup so org owners (whose `organizationId` is set after the seed attaches them to their org) can sign in. Without this fix, `POST /api/auth/login {demo@votewise.com.ng, Demo@1234}` returned 401 UNAUTHORIZED, making the entire dashboard unreachable via the documented credentials.

## Dev-server recovery
- After `bun run db:push` recreated `db/custom.db`, the running dev server held a stale Prisma connection that reported `SQLITE_READONLY` on writes.
- Restarted the dev server detached via `setsid bash -c 'cd /home/z/my-project && exec bun run dev' </dev/null >/tmp/dev.out 2>&1 &`. Dev server back on :3000, login + dashboard + APIs all green.

## End-to-end verification (curl against running dev server)
Authenticated as `demo@votewise.com.ng / Demo@1234` (org: "Nnamdi Azikiwe University", tier: PROFESSIONAL).

Routes (all 200):
- `GET /dashboard`
- `GET /dashboard/elections`
- `GET /dashboard/elections/{id}`
- `GET /dashboard/elections/{id}/positions`
- `GET /dashboard/elections/{id}/candidates`
- `GET /dashboard/elections/{id}/voters`
- `GET /dashboard/elections/{id}/results`
- `GET /dashboard/elections/{id}/activate`

API endpoints (all `success: true`):
- `GET /api/auth/me` → `{user, organization}`
- `GET /api/admin/stats` → 3 elections, 1 active, 20 voters, 9 candidates, 6 votes, 1 pending ticket, 2 security alerts (0 critical)
- `GET /api/elections` → 3 elections with `_count`
- `GET /api/elections/{id}` → election detail
- `GET /api/elections/{id}/analytics` → stats + timeline + results
- `GET /api/elections/{id}/audit` → logs
- `GET /api/elections/{id}/positions` → positions with `_count`
- `GET /api/elections/{id}/candidates` → candidates with position + `_count`
- `GET /api/elections/{id}/voters` → voters list
- `GET /api/elections/{id}/results` → ranked results with winnerId + isTie
- `GET /api/elections/{id}/activation` → pricing snapshot
- `GET /api/notifications` → notifications list

Mutation flows verified:
- `POST /api/elections` (create) → 200, returns election
- `POST /api/elections/{id}/positions` (create) → 200, returns position (auto-transitions to CONFIGURATION)
- `POST /api/elections/{id}/voters/import mode=preview` → 200, returns preview stats
- `POST /api/elections/{id}/voters/import mode=import` → 200, returns import summary
- `POST /api/elections/{id}/activation/pay` → 200, returns payment reference + COMPLETED status

## Lint
- `bun run lint` on all files in scope: **0 errors, 0 warnings**.
- Exit code 0.

## Notes for downstream agents
- The shared `status-badge.tsx` (Task 1) still uses `indigo` for the SCHEDULED state. That's outside Task 6's scope. If the design system needs to be 100% indigo-free, swap that single Tailwind class in `src/components/shared/status-badge.tsx`.
- The org slug generated by `OrganizationService.create({ name: "Nnamdi Azikiwe University" })` is `nnamdi-azikiwe-university` (slugified from the name). The worklog mentions slug `unizik` — that's a Task 1 seed discrepancy, not a dashboard issue.
- The sidebar nav has a "Voters" item with `comingSoon: true` that points to `/dashboard/elections`. If/when a top-level Voters page is added, update `nav-config.ts` to point at the new route and drop `comingSoon`.
- The other dashboard routes that the sidebar links to (`/dashboard/support`, `/dashboard/audit`, `/dashboard/security`, `/dashboard/users`, `/dashboard/subscription`, `/dashboard/notifications`, `/dashboard/settings`, `/dashboard/commercial`) exist as Task 1 stubs and return 200, but their content was not part of Task 6's scope.
