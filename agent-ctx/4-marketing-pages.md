# Task 4 — Public Marketing Pages (Landing + Pricing)

**Agent:** Frontend / Marketing
**Task:** Build the public marketing surface for Votewise: the landing page (`/`) and pricing page (`/pricing`), plus reusable shared `<SiteHeader>` and `<SiteFooter>`.

## What was built

### Shared components (reusable by any public route)
- `src/components/shared/reveal.tsx` — client Framer Motion `whileInView` fade-in-up wrapper. Returns a plain `<div>` when `prefers-reduced-motion` is active (no animation, no hydration risk). Props: `children`, `delay`, `className`.
- `src/components/shared/site-header.tsx` — client. Sticky, `backdrop-blur`. `<Logo size="md">` left; desktop nav (Features / How it works / Security / Pricing / FAQ) — hash links call `el.scrollIntoView({behavior:'smooth'})`, route links use `<Link>`; `ThemeToggle`; ghost `Sign In` → /login; primary `Get Started` → /register. Mobile: shadcn `Sheet` (right) with stacked nav + CTAs (`SheetClose asChild` for auto-close).
- `src/components/shared/site-footer.tsx` — server component, `mt-auto`. 6-col grid: brand + tagline + 5 social icons (lucide Twitter/LinkedIn/Facebook/GitHub/Mail), then 4 link columns (Product / Company / Resources / Legal). Bottom row: copyright + "Demo credentials: admin@votewise.com.ng" linking to /login.

### Landing page — `src/app/page.tsx` (server component)
13 sections in the requested order:
1. **Hero** — `bg-grid` + `bg-radial-fade`; eyebrow badge with `pulse-dot` ("Secure. Transparent. Trusted."); H1 with `text-gradient` on "Election Management"; dual CTA (`Start Free Election` → /register, `Book a Demo` → /support); 3 trust stats (10k+ / 100% / <3s); floating mock **Election Command Center** card (div-built: `<StatusBadge status="LIVE">`, turnout/votes/remaining tiles, 12-bar mini chart, 3 candidate progress bars) inside `<Reveal delay={0.15}>`.
2. **Use-cases strip** — 8 pills (Universities, Student Unions, Professional Associations, Churches, Cooperatives & NGOs, Corporate Organizations, Clubs & Societies, Government Institutions).
3. **Why Votewise** — 6 feature cards (ShieldCheck, Vote, BarChart3, Users, Lock, Zap) with hover shadow, each in a `<Reveal>`.
4. **How it works** — 4 numbered steps with desktop connecting line.
5. **Security** — emerald `bg-primary` panel, 2-col: copy + checklist of 6 guarantees (end-to-end verification, tamper-proof ballots, ballot secrecy, audit trails, rate limiting, anti-enumeration).
6. **Real-time monitoring** — 4 stat tiles (live turnout / verified voters / active sessions / system health) + faux "votes per minute" 15-bar chart + system-health strip.
7. **Analytics preview** — results card "Departmental Class Rep Election 2024" with 4 candidates, colored progress bars, ballot-hash-verified footer.
8. **Testimonials** — 3 quote cards (Unilag, Lagos Chamber of Commerce, Nnamdi Azikiwe University).
9. **Pricing preview** — 3 plans (Starter/Professional/Enterprise) from `SUBSCRIPTION_PLANS`; "Most popular" on Professional; "See full pricing" → /pricing.
10. **FAQ** — shadcn `Accordion` with 6 Q&As (voter privacy, verification, audit, bulk pricing, channels, data residency).
11. **Final CTA** — gradient emerald panel with grid overlay.
12. `<SiteFooter />`.

All sections use `scroll-mt-24` so smooth-scroll clears the 64px sticky header.

### Pricing page — `src/app/pricing/page.tsx` (server component, `metadata.title = "Pricing"`)
- **Hero** — `bg-grid` + `bg-radial-fade`, Breadcrumb (Home / Pricing), H1, subtitle, emerald savings note.
- **Plan cards** — 4 plans (FREE/STARTER/PROFESSIONAL/ENTERPRISE) from `SUBSCRIPTION_PLANS`, formatted via `formatCurrency` with `-1` → "Custom" and `0` → "Free". PROFESSIONAL highlighted "Most popular" with `shadow-glow`. CTA → /register.
- **Per-voter pricing** — 2-col: copy + "Cost calculator (example)" card showing ₦400 standard × 2000 + ₦300 bulk × 3000 = ₦1,700,000 with savings vs ₦2,000,000. Pulls rates from `PRICING_CONFIG`.
- **Election activation flow** — 4 steps (Configure / Choose plan / Pay & activate / Go LIVE) with connecting line.
- **Comparison table** — 14 rows × 4 plans via shadcn `Table`; Check/X icons; Professional column tinted `bg-primary/5`.
- **Pricing FAQ** — 6 Q&As in `Accordion`.
- **Final CTA** gradient panel.
- `<SiteFooter />`.

## Quality / correctness notes
- Institutional emerald theme only — **no indigo/blue**.
- Mobile-first responsive 360px → 1440px+.
- Sticky footer via `min-h-screen flex flex-col` wrapper + `main flex-1` + footer `mt-auto`.
- Semantic landmarks (`header` / `main` / `footer` / `section` / `nav`); ARIA labels on icon-only buttons; visible focus rings.
- All Framer Motion gated by `useReducedMotion`.
- No `Math.random()` / `Date.now()` in client output → no hydration mismatch. `SiteFooter`'s `new Date().getFullYear()` is server-rendered so SSR HTML === hydration HTML.
- Server components wherever possible; client islands only where needed (`SiteHeader`, `Reveal`, `Accordion`, `Sheet`, `ThemeToggle`, `Table`).

## Verification
- `GET /` → 200, `GET /pricing` → 200 on the running dev server.
- `bun run lint` on my 5 files → **0 errors**. (2 pre-existing errors in `src/services/voter.service.ts` from Task 1 are out of scope and untouched.)
- grep-confirmed all section headings render in served HTML.

## Files added
- `src/components/shared/reveal.tsx`
- `src/components/shared/site-header.tsx`
- `src/components/shared/site-footer.tsx`
- `src/app/page.tsx`
- `src/app/pricing/page.tsx`
- `agent-ctx/4-marketing-pages.md` (this file)

## Routes owned
- `/` (landing)
- `/pricing` (pricing)

## Downstream notes
- `<SiteHeader>` and `<SiteFooter>` are importable by any future public route (e.g. a `/about` or `/blog` page). They already link to `/login`, `/register`, `/support` and `/pricing`.
- The nav smooth-scroll relies on section IDs: `#features`, `#how-it-works`, `#security`, `#faq`, `#monitoring`, `#analytics`. If a future landing refactor renames these, update `NAV_ITEMS` in `site-header.tsx`.
- All plan/price text is generated from `SUBSCRIPTION_PLANS` and `PRICING_CONFIG` — no hardcoded plan data anywhere, so backend pricing changes propagate automatically.
