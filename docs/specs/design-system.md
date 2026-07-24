# Design system

Reference: `docs/Designs/Design-1.png`. That mockup uses the name "SENTINEL" — treat
it as visual reference only; brand stays **Watchtower**.

The goal is a product that reads as *deliberately made* rather than *shadcn-default*.
Every rule below exists to move the UI away from the generic AI-dashboard look.

## Principles

1. **Data first, chrome last.** Numbers are the largest thing on screen; buttons,
   labels, and icons are small and quiet. If a chart and a button compete for
   attention, the button loses.
2. **Dark by default, and *actually* dark.** Zinc/slate backgrounds at black-90+.
   No off-white "dark mode" that reads as gray. Light mode exists but is not the
   canonical look.
3. **Uppercase for structure, sentence case for content.** Section labels,
   KPI titles, and table headers are `UPPERCASE` with tracked letter-spacing.
   Body copy, issue titles, and user-generated strings are never uppercased.
4. **Semantic color, not decorative color.** The palette has one accent (blue)
   plus three semantic colors (red/yellow/green). Nothing else. If a status is
   "informational", it's white or muted — not "brand purple".
5. **Tinted status containers.** A card *about* a bad thing has a red-tinted
   background, not a red border on a gray card. See KPI patterns below.
6. **No decorative illustrations.** No isometric SVGs, no gradient blobs, no
   empty-state cartoons. Empty states are a sentence and a button.
7. **One radius, one shadow.** Every card uses the same corner radius and the
   same (very subtle) elevation. Variety comes from content, not from styling.
8. **Icons only where they do work.** Nav gets icons. Buttons that fit next to a
   label don't. Never decorate a heading with an icon.
9. **Numbers are tabular.** Every numeric column and KPI uses `font-variant-numeric:
   tabular-nums` so digits align.

## Brand

- Name: **Watchtower**.
- Logomark: an octagonal shield-and-tower glyph in the primary blue; see
  `frontend/public/logo.svg` (to be produced — matches the polygonal S from the
  reference in geometric spirit, not letterform).
- Wordmark: `WATCHTOWER` in `Space Grotesk` 600, letter-spacing `0.08em`, in
  primary text color. Never combine wordmark with a tagline in the header.

## Color tokens

All defined as CSS custom properties in `frontend/src/app/globals.css` and mirrored
into `tailwind.config.ts` as `theme.extend.colors.wt.*`. Values below are the dark
theme; light theme flips backgrounds and text but keeps semantic hues identical.

```
--wt-bg-0:        #0A0D14   /* app background */
--wt-bg-1:        #0F131C   /* sidebar */
--wt-bg-2:        #141926   /* card */
--wt-bg-3:        #1B2130   /* card hover / raised */
--wt-border:      #232A3B   /* card / input border */
--wt-border-soft: #1A2030   /* row dividers */

--wt-text:        #E8ECF4   /* primary */
--wt-text-muted:  #98A2B8   /* secondary */
--wt-text-dim:    #626B82   /* tertiary, labels */

--wt-accent:      #3B82F6   /* primary blue */
--wt-accent-2:    #60A5FA   /* hover / link */
--wt-accent-soft: #1E3A8A22 /* accent-tinted background */

--wt-danger:      #EF4444
--wt-danger-soft: #7F1D1D33 /* red-tinted KPI card bg */
--wt-warn:        #F59E0B
--wt-warn-soft:   #78350F33 /* amber-tinted KPI card bg */
--wt-success:     #22C55E
--wt-success-soft:#14532D33
```

Rules:

- Never pick a color outside the token list. If you need one, add it here first.
- `-soft` variants are only for backgrounds, never for text.
- Focus rings use `--wt-accent` at 60% opacity, 2px, offset 2px against `--wt-bg-0`.

### Data-viz palette

Charts use this ordered palette; category assignment is stable (index → color):

```
1. #3B82F6   blue     (primary series)
2. #F59E0B   amber
3. #22C55E   green
4. #A855F7   violet
5. #EC4899   pink
6. #14B8A6   teal
7. #94A3B8   slate    (Others / catch-all)
```

Line charts fill under the line with the same color at 12% opacity, top to 0% at
the axis. Donut segments use the palette in category-sorted order; the smallest
segments always share `slate` under an "Others" bucket.

## Typography

Two families, both self-hosted via `next/font`. No Google Fonts CDN.

- **Display:** `Space Grotesk` — headings, KPI numbers, brand.
- **Body / UI:** `Inter` — everything else.
- **Mono:** `JetBrains Mono` — stack traces, log lines, code.

Scale (Tailwind class → size / line-height / tracking):

```
kpi-xl    text-[44px]/[48px] font-semibold tracking-[-0.02em]  (KPI hero number)
h1        text-2xl/8   font-semibold tracking-tight
h2        text-lg/7    font-semibold tracking-tight
label     text-xs/4    font-medium   uppercase tracking-[0.08em] text-wt-text-dim
body      text-sm/5    font-normal
body-lg   text-base/6  font-normal
mono      text-[13px]/[20px] font-mono
```

Page-title pattern (matches reference):

```tsx
<h1 className="label text-wt-text">ERROR TRACKING DASHBOARD</h1>
<span className="text-wt-text-muted">| Project: Web App (Prod)</span>
```

Both on one line, uppercase label + sentence-case context, separated by a thin
vertical bar character.

## Layout

- App shell: fixed **`w-64` sidebar** on the left, `w-14` when collapsed, with a
  toggle in the top-right of the sidebar. Sidebar background `--wt-bg-1`.
- Main content: padded `px-8 py-6`, background `--wt-bg-0`.
- Cards fill the available column; use a 12-column grid at `>=lg` for dashboards.
  The reference uses roughly `col-span-8 / col-span-4` split — codify that as the
  default "chart + side panel" pattern.
- Vertical rhythm: `space-y-6` between cards, `space-y-4` between rows inside a
  card, `space-y-2` for label→value pairs.
- Radius: `rounded-xl` (12px) on cards. `rounded-md` (6px) on inputs and buttons.
  No `rounded-2xl`, no `rounded-full` except avatars and dot indicators.
- Elevation: cards do not use `box-shadow`. Depth comes from background tone
  step (`bg-0` → `bg-2`) and a 1px `--wt-border`. Modals get one shadow token:
  `shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]`.

## Component patterns

### Sidebar

- Logo top-left, collapse toggle top-right.
- Nav items: `h-10 px-3` with icon + label. Active item gets `--wt-accent-soft`
  background and a 2px `--wt-accent` inset on the left edge.
- Badges (issue counts) sit right-aligned in muted text; use `--wt-accent-soft`
  bg when the count > 0.
- Bottom pinned: project switcher card, team switcher card, user card with
  avatar + email. Each card `--wt-bg-2` on `--wt-bg-1`.

### KPI card

```
┌─────────────────────────────────────┐
│ UNRESOLVED ISSUES              ⚠︎  │   ← label + optional status icon
│                                     │
│ 32                                  │   ← kpi-xl number
│                                     │
│ +12% since last hour                │   ← delta (color = semantic)
└─────────────────────────────────────┘
```

Rules:

- Neutral KPIs: `--wt-bg-2` background.
- Bad-news KPIs (unresolved errors, downtime, breach): tint the whole card with
  `--wt-danger-soft`. Border stays `--wt-border`.
- Cautionary KPIs (affected users, degraded perf): `--wt-warn-soft`.
- Delta text color: `--wt-success` when the change is *good for the user*,
  `--wt-danger` when bad. The sign alone doesn't decide — "-2% total events" is
  green, "+12% unresolved" is red.
- Number uses `tabular-nums`. Small suffix like `k`/`M` is same size as the digit,
  same weight.

### Chart card

- Header row: uppercase label on the left, filters/actions on the right.
- Body: chart with `240–320px` height on desktop.
- Footer row: filter controls (Time Range, Environment, Search) live *below* the
  chart in a bordered strip, matching the reference. Don't stuff them into the
  header.
- Tooltip: dark card `--wt-bg-3`, `--wt-border`, small padding, tabular numbers,
  dashed vertical guide line on hover (`stroke-dasharray: 4 4`).

### Table (issue list, log list, host list)

- Header row: uppercase `label` typography, `--wt-text-dim`, `border-b`
  `--wt-border-soft`.
- Rows: `h-14`, hover state `--wt-bg-3` at 60% opacity, no zebra striping.
- Status column is a dot: `size-2.5 rounded-full` in the semantic color. No text
  inside the dot. The row is the primary click target.
- Actions column: text-only links in `--wt-accent-2`, separated by a middle-dot
  `·`, not "|" and not pills.
- Empty state inside a table: single sentence in `--wt-text-muted`, no
  illustration.

### Buttons

- Primary: `--wt-accent` bg, white text, `h-9 px-4`, `rounded-md`.
- Secondary: transparent bg, `--wt-border` border, `--wt-text`.
- Ghost: transparent bg, no border, hover `--wt-bg-3`.
- Destructive: `--wt-danger` bg only in confirm dialogs; elsewhere use text link
  in `--wt-danger`.
- Never gradient. Never `shadow-lg`. Never uppercase button labels.

### Inputs

- `h-9`, `--wt-bg-2` bg, `--wt-border` border, `rounded-md`.
- Placeholder in `--wt-text-dim`.
- Search inputs get a left-aligned icon; nothing else does by default.

### Dropdown / select

- Trigger identical to input styling; caret is a 12px chevron in `--wt-text-muted`.
- Menu panel: `--wt-bg-3`, `--wt-border`, `rounded-md`, item hover `--wt-accent-soft`.

### Modal / drawer

- Backdrop: `rgba(0,0,0,0.6)` with a 4px backdrop blur.
- Panel: `--wt-bg-2`, `rounded-xl`, max-width `640px` for modals, right-side
  drawer `560px` wide for issue detail from a list.

### Toasts

- Bottom-right, `--wt-bg-3`, `--wt-border`, semantic left border (4px) matching
  the toast level. No icons in toasts.

### Stack trace viewer

- `--wt-bg-2` container. Frames stacked; app-frames highlighted with an
  `--wt-accent-soft` background, vendor frames dim (`--wt-text-dim`).
- Source context uses `JetBrains Mono` at `mono` size. Current line marked with a
  1px left border in `--wt-accent`.

## Data viz rules

- Line charts: 1.5px stroke, primary color, filled area at 12% → 0% opacity.
- Multi-series lines: solid + dashed differentiator when printed in mono.
- Bar charts: 4px bar radius on the top corners only.
- Donut charts: 24px stroke width against a `--wt-bg-2` inner circle. Legend
  labels around the donut, colored dot + name + percentage. No center label
  unless it's the "total" number.
- Axes: `--wt-text-dim`, `text-xs`, tick marks removed, gridlines at 8% white.
- Never show more than 6 colored series in one chart. Roll extras into an
  "Others" bucket (slate).

## Motion

- Only three motions exist:
  - `transition-colors duration-150` on hover states.
  - `transition-transform duration-200` on chevrons and drawers.
  - `animate-pulse` on skeletons.
- No page-load orchestration, no `framer-motion` for decoration. Import
  `framer-motion` only for the drawer/modal enter-exit.

## Iconography

- Library: **Lucide** at `1.5` stroke width, `size-4` in nav and buttons,
  `size-5` in KPI badges. Never mix libraries.
- No icon-only nav items outside the collapsed sidebar.

## Anti-patterns (do not do)

- Gradient hero sections, mesh-gradient backgrounds, blurred blob decorations.
- Every-card-a-different-color palettes.
- Emoji as icons.
- Rounded-full "pill" buttons for primary actions.
- Sentence-case section labels ("Latest unresolved issues") in places the design
  system says uppercase.
- shadcn-default focus rings (2-color outline). Use the token above.
- Purple accent, teal accent, or any "brand color" that isn't in the token list.
- Marketing-style testimonials, feature icons, or landing-page motifs anywhere
  inside the authed product.
- Numbers displayed as `1,234` in one place and `1.2k` in another. Pick per
  column and stick with it.

## Implementation

- Tailwind config exposes tokens as `wt-bg-0`, `wt-text`, etc. Prefer these
  over raw hex or Tailwind's default palette; the default palette is fine only
  for zero-brand utility (`text-transparent`, `border-transparent`).
- shadcn/ui components are the base but *every* one is themed via CSS variables
  in `globals.css`. Do not add a shadcn component to the repo without mapping
  its default CSS variables onto the tokens above.
- One file, `frontend/src/styles/tokens.css`, is the single source of truth for
  values. `tailwind.config.ts` reads from it via `var(--wt-…)`.
- A Storybook or a `/dev/kitchen-sink` route renders every component in a
  scrollable page for visual review. Build it once, keep it up to date.

## Files this spec adds

```
frontend/src/styles/tokens.css
frontend/tailwind.config.ts                       # tokens wired through
frontend/src/app/globals.css                      # imports tokens.css
frontend/src/components/ui/*                      # themed shadcn primitives
frontend/src/components/kpi-card.tsx
frontend/src/components/chart-card.tsx
frontend/src/components/data-table.tsx
frontend/src/components/status-dot.tsx
frontend/src/components/layout/sidebar.tsx
frontend/src/components/layout/header.tsx
frontend/src/app/dev/kitchen-sink/page.tsx
frontend/public/fonts/{Inter,SpaceGrotesk,JetBrainsMono}/*.woff2
frontend/public/logo.svg
```
