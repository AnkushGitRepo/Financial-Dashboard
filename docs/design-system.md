# MarketMitra Design System

The single source of visual truth for MarketMitra v2. Every new page or component should be built against this file, not against whatever the last page happened to do. Extracted from the actual landing page implementation (`src/styles/tokens.css` + `src/components/landing/`) — if this doc and the code disagree, the code is probably right and this doc is stale; fix whichever is wrong.

Per [ADR 0003](./decisions/0003-css-modules-no-framework.md): CSS Modules only, no Tailwind/Bootstrap, no competing utility framework. Every value below is a CSS custom property in `src/styles/tokens.css` — components consume `var(--token-name)`, never a raw hex/px value, except for true one-offs (see "When it's OK to hardcode" at the bottom).

## Principles

- **Warm, light, high-contrast.** Cream/off-white surfaces, near-black text, soft multi-color radial-gradient washes behind hero/footer sections. Dark surfaces (`--color-surface-dark`) are used sparingly as an accent — the "self-hosted" pricing card, the open-source panel, the footer, dark CTA buttons — not as a whole-page theme.
- **Pill-shaped interactive elements.** Nav, buttons, badges, tabs — almost everything interactive uses `--radius-pill` (999px). Cards use larger fixed radii (`--radius-lg` to `--radius-2xl`).
- **Mono for metadata, sans for content.** JetBrains Mono (`--font-mono`) is reserved for uppercase eyebrow labels, timestamps, and small data labels. Manrope (`--font-sans`) is everything else — headings, body, buttons.
- **Motion is additive, never load-bearing.** Every animation (load-in fades, scroll reveals, accordion expand) must degrade to an instant, fully-visible state under `prefers-reduced-motion: reduce`. See "Motion" below.

## Color

### Surfaces

| Token                    | Value     | Use                                                                                         |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------- |
| `--color-bg`             | `#fbfaf8` | Page background                                                                             |
| `--color-bg-alt`         | `#faf9f5` | Secondary background wash                                                                   |
| `--color-surface`        | `#ffffff` | Cards, inputs, the navbar pill                                                              |
| `--color-surface-sunken` | `#faf9f6` | Inset panels inside a card (e.g. dashboard preview side panels)                             |
| `--color-surface-dark`   | `#15171c` | Dark accent surface — dark CTA buttons, self-hosted pricing card, footer, open-source panel |

### Text

| Token                         | Value     | Use                                   |
| ----------------------------- | --------- | ------------------------------------- |
| `--color-text`                | `#15171c` | Primary text on light surfaces        |
| `--color-text-secondary`      | `#4b5057` | Nav links, secondary emphasis         |
| `--color-text-muted`          | `#5b6067` | Body copy on light surfaces           |
| `--color-text-faint`          | `#6b7078` | De-emphasized captions                |
| `--color-text-subtle`         | `#8a9099` | Eyebrow labels, placeholder-ish text  |
| `--color-text-on-dark`        | `#ffffff` | Primary text on dark surfaces         |
| `--color-text-on-dark-muted`  | `#b9bfc6` | Body copy on dark surfaces            |
| `--color-text-on-dark-faint`  | `#9aa0a8` | Captions on dark surfaces             |
| `--color-text-on-dark-subtle` | `#6f757d` | Lowest-emphasis text on dark surfaces |

### Brand / accent

| Token                                               | Value                 | Use                                                                       |
| --------------------------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| `--color-mint`                                      | `#7ee2a8`             | Brand accent — logo mark accent on dark, "self-hosted" tier accents       |
| `--color-mint-strong`                               | `#34c17c`             | Positive/up state (candlestick up-bars, focus ring), stronger mint accent |
| `--color-mint-text`                                 | `#0f6b3f`             | Text on mint-tinted backgrounds (positive deltas)                         |
| `--color-mint-bg`                                   | `#d9f7e6`             | Positive delta pill background                                            |
| `--color-amber-bg` / `--color-amber-text`           | `#ffe0c2` / `#8a4b12` | "Hosted" / "For investors" tag                                            |
| `--color-amber-bg-soft` / `--color-amber-text-soft` | `#ffe9b8` / `#7a5200` | Secondary amber accent (feature icon bg)                                  |
| `--color-violet-bg` / `--color-violet-text`         | `#e7e4ff` / `#40389c` | Tertiary accent (insights/AI-flavored icon bg)                            |
| `--color-danger`                                    | `#f04438`             | Notification dot, error state                                             |
| `--color-danger-soft`                               | `#f0836b`             | Negative/down state (candlestick down-bars)                               |

### Borders

`--border-hairline` (`rgba(21,23,28,.07)`) is the default card/panel border. `--border-hairline-soft` (`.05`) for barely-there dividers, `--border-hairline-strong` (`.1`) for buttons/inputs that need to read as a distinct control. On dark surfaces, use `--border-on-dark` (`rgba(255,255,255,.14)`) / `--border-on-dark-soft` (`.1`).

### Gradients (not tokenized — see "When it's OK to hardcode")

Large decorative gradients (page background, hero band, footer, open-source panel, hosted pricing card) are defined per-component as literal `radial-gradient`/`linear-gradient` stacks layering the brand colors at low opacity. These are intentionally not tokenized as single variables since each is a bespoke multi-stop composition — copy the pattern from `src/app/page.module.css` (`.page`, `.heroBand`) or `src/components/landing/Footer.module.css` rather than inventing a new gradient recipe.

## Typography

Fonts loaded via `next/font/google` in `src/app/layout.tsx`: **Manrope** (400/500/600/700/800) and **JetBrains Mono** (400/500), exposed as `--font-manrope`/`--font-jetbrains-mono` and consumed through `--font-sans`/`--font-mono`.

| Token         | Size                                     | Typical use                                 |
| ------------- | ---------------------------------------- | ------------------------------------------- |
| `--text-2xs`  | 11px                                     | Mono eyebrow labels, timestamps, small caps |
| `--text-xs`   | 12px                                     | Badges, stat deltas                         |
| `--text-sm`   | 13px                                     | Nav links, small buttons                    |
| `--text-base` | 15px                                     | Body copy default                           |
| `--text-md`   | 17px                                     | FAQ question, larger body                   |
| `--text-lg`   | 19px                                     | Card titles (h3)                            |
| `--text-xl`   | 22px                                     | Pricing tier name                           |
| `--text-2xl`  | 28px                                     | Stat emphasis                               |
| `--text-3xl`  | 42px                                     | Dense section h2 (How it works, FAQ)        |
| `--text-4xl`  | 48px                                     | Section h2 (Features, Pricing, Open source) |
| `--text-hero` | `clamp(2.75rem, 4vw + 1.75rem, 5.75rem)` | Hero h1 only — fluid, ~44px→92px            |

Headings: `font-weight: 800`, negative letter-spacing (`-0.02em` to `-0.045em`, tighter at larger sizes). Body: `font-weight: 400`, `line-height: 1.5–1.6`. Eyebrow labels: mono, `0.6875rem`–`0.75rem`, `letter-spacing: 0.1em`, `text-transform: uppercase`, `color: var(--color-text-subtle)`.

## Spacing

4px base unit, `--space-1` (4px) through `--space-28` (104px) — see `tokens.css` for the full scale. Section vertical rhythm: large sections use `--space-24`–`--space-28` top padding on desktop, collapsing to `--space-16` or less under the 640px breakpoint. Section horizontal padding is `--space-8` desktop / `--space-4` mobile, content capped at `max-width: 1200px` (`1080px` for the hero, `640px`–`640px` for section intro text blocks) and centered with `margin: 0 auto`.

## Radii, shadows, motion

- **Radii:** `--radius-sm` (12px, small chips) → `--radius-2xl` (30px, largest cards) → `--radius-pill` (999px, everything interactive: buttons, nav, tabs, badges).
- **Shadows:** `--shadow-card` (default card lift), `--shadow-card-lg` (hover state / pricing card), `--shadow-nav` (navbar once scrolled), `--shadow-dark` (dark-surface card hover).
- **Motion tokens:** `--ease-out` (`cubic-bezier(.2,.8,.3,1)`), `--duration-fast` (180ms, hover/press), `--duration-base` (320ms, reveals/accordions), `--duration-slow` (500ms, page-load fades).
- **Reduced motion is mandatory, not optional.** Every keyframe animation must be wrapped in `@media (prefers-reduced-motion: no-preference)` (CSS) or gated behind Framer Motion's `useReducedMotion()` (JS) — see `src/components/landing/Reveal.tsx` for the reference pattern. The reduced-motion fallback must render the _final_ state instantly, never a stuck-hidden state.
- **Hover-lift effects** (`transform: translateY(-4px)` + shadow increase) are gated to `@media (hover: hover) and (pointer: fine)` — never applied on touch devices.

## Component patterns

- **Buttons:** pill radius, `font-weight: 700`. Primary = `--color-surface-dark` bg / white text, hover darkens to `#292c33`. Secondary = white bg, `--border-hairline-strong` border. On dark surfaces, invert (white bg primary, transparent+border secondary). All buttons/links used as tap targets get `min-height: 44px`.
- **Cards:** white surface, `--border-hairline`, `--shadow-card`, radius `--radius-xl` or `--radius-2xl`. Dark-variant cards swap to `--color-surface-dark` background and `--color-text-on-dark*` text tokens.
- **Pills/tabs/badges:** `--radius-pill`, small padding, mono font for data-flavored labels (ranges, stats), sans font for nav-flavored labels (tabs). Active/selected state = solid `--color-surface-dark` background + white text.
- **Section header pattern:** mono eyebrow label → `<h2>` at `--text-3xl`/`--text-4xl` → optional muted intro paragraph at `--text-base`, all left-aligned, capped at ~620–640px width even inside a wider section.
- **Iconography:** inline SVG, 18–22px, `stroke-width: 1.9` (feature icons) or `2.3` (logo mark), `stroke-linecap/linejoin: round`, `aria-hidden="true"` (all icons here are decorative — adjacent text carries the meaning).
- **Scroll reveals:** `Reveal`/`RevealGroup`/`RevealItem` (`src/components/landing/Reveal.tsx`) — Framer Motion `whileInView`, `viewport={{ once: true, margin: '-80px' }}`, opacity+translateY(22px)→0, staggered via `RevealGroup`'s `stagger` prop (default 0.09s). Reuse these for any new page's scroll-triggered content rather than hand-rolling IntersectionObserver logic.

## Layout gotchas learned the hard way

- **CSS Grid:** use `minmax(0, 1fr)`, never plain `1fr`, for `grid-template-columns`. A plain `1fr` track won't shrink below its content's min-content width — this caused a real, silent mobile overflow (invisibly clipped by a parent's `overflow: hidden` rather than showing a scrollbar) on the auth pages. Default to `minmax(0, 1fr)` everywhere on this project now.
- **Third-party embedded UI (Clerk, or anything similar):** don't assume your own container styling is enough. Check `getComputedStyle()` on every ancestor element the third-party library renders, not just the elements you can see clickable states on — a nested wrapper with its own `border-radius` + `overflow: hidden` can clip corners even when every element you actually styled computes correctly. See `/docs/archive/auth-pages.md` for the full story (a Clerk-internal `cardBox` wrapper, not `card`, was the actual clipping culprit).

## When it's OK to hardcode

Large bespoke multi-stop gradients (page/section backgrounds) and one-off pixel values inside a single, non-reused SVG icon are the only accepted exceptions to "always use a token." Everything else — color, spacing, font-size, radius, shadow, duration — goes through a token. If you find yourself reaching for a raw hex or px value outside those two cases, either an existing token fits (check this doc first) or a new token belongs in `tokens.css`, not inline in a component.

## Provenance

Built from the Phase 3 landing page (`src/app/page.tsx` + `src/components/landing/*`, see `/docs/architecture.md` → "Landing page component structure"). Any future page (auth screens, dashboard) should be built against this doc so the whole product reads as one system — update this file when a new page introduces a genuinely new pattern (don't let patterns drift silently across pages).
