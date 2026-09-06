# Dashboard shell (`/dashboard`) — archived detail

Shipped 2026-09-04. Summary lives in `/docs/architecture.md` under "Shipped features"; this file is the full detail for whoever next touches this page.

## Component structure

`src/app/dashboard/layout.tsx` wraps every `/dashboard/*` route in the shell so future feature pages inherit it automatically. Components live in `src/components/dashboard/`:

| Component            | Notes                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Sidebar`            | Persistent left nav (top bar on mobile, <900px). Logo, 4 nav items (Dashboard/Portfolio/Markets/Insights — matching the landing page's `DashboardPreview` tab naming for consistency), Clerk `UserButton` + name at the bottom. Only "Dashboard" is a real link; the other 3 render disabled with a "Soon" badge rather than linking to routes that don't exist yet — no dead links. |
| `dashboard/page.tsx` | Honest empty state: "No holdings yet" + a sentence explaining this is the shell, not a finished feature. No fabricated data, no placeholder numbers.                                                                                                                                                                                                                                 |

## Verification note

`/dashboard` requires a signed-in session and no test account existed at build time, so the shell was verified visually via a temporary unprotected preview route (`src/app/mm-preview-dashboard-shell/page.tsx`) — created, screenshotted at desktop (1440px) and mobile (390px), then deleted before committing (confirmed gone via `git status` before the commit). The real `/dashboard` route was separately confirmed to still redirect unauthenticated visitors to `/sign-in` correctly with the new layout in place.

## Decisions

Nothing new architecturally — pure implementation of `/docs/design-system.md` applied to a new page. No new patterns introduced; if this page's structure needs to change later, it's a straightforward CSS Modules edit, not an architecture question.
