# Design System — Liquid Glass

> **Canonical source of truth for all UI in this project.** Claude Code: read this before building or styling any component (see CLAUDE.md). Tokens defined here must exist as CSS custom properties in `app/globals.css` — never hardcode values in components.

## Status

✅ Liquid Glass Design System v1 (frozen 2026-07-04). This file lists the **subset in active use** in this app; the full system defines more (60+ components, dark theme, dataviz, overlays) — pull more tokens in as features need them, never invent new names.

## 1. Principles

- **Light + ambient light.** A near-white vertical gradient background with two fixed, heavily blurred blue glows behind all content. Backgrounds are never flat, never photographic, never patterned.
- **Liquid glass surfaces.** Every raised element is frosted glass: a white→blue-tint gradient over `backdrop-filter: blur(28px) saturate(215%)`, a 1px white specular border, a screen-blend top sheen, and an inset ring. Depth comes from blur and shadow, never heavy color.
- **One accent, used sparingly.** Ocean blue `#0b5cab`. Accent appears as text on a tint, not as a solid fill. Status colors (green/red/amber) only for status.
- **Radii step down by role.** Bigger surface → bigger radius; nested elements step inward. Pills everywhere for buttons, tags, nav.
- **Restrained motion.** Hover lifts 1px and deepens shadow — nothing scales, nothing changes hue (except ghost-button tint reveal). All motion collapses under `prefers-reduced-motion`.
- **Apple-adjacent type.** SF Pro via the system stack (no webfonts shipped). Tight negative tracking on display sizes, roomy 1.7 leading on body.
- **Dark theme exists but is opt-in** (`data-theme="dark"`). Not yet wired into this app — adopt deliberately, not by default.

## 2. Tokens

All values live in `app/globals.css` under `:root` and must stay byte-identical to this table.

### Background & glows
| Token | Value | Use |
|-------|-------|-----|
| `--bg-top` | `#f5f7fb` | Gradient start |
| `--bg-bottom` | `#e8eef6` | Gradient end |
| `--bg-gradient` | `linear-gradient(180deg, #f5f7fb 0%, #e8eef6 100%)` | Page background (fixed) |
| `--glow-blue-med` | `rgba(99, 164, 240, 0.34)` | Upper-right ambient bloom |
| `--glow-blue-tint` | `rgba(125, 180, 240, 0.20)` | Lower-left counter-bloom |

### Text
| Token | Value | Use |
|-------|-------|-----|
| `--text-strong` | `#0b1420` | Headings, near-black |
| `--text-body` | `rgba(11, 20, 32, 0.82)` | Primary body |
| `--text-muted` | `#8f9eb0` | Meta, captions, secondary |
| `--text-subtle` | `#546274` | Labels on chips |

### Accent (Ocean) & status
| Token | Value | Use |
|-------|-------|-----|
| `--accent` | `#0b5cab` | Actions, highlights |
| `--accent-light` | `#7db4f0` | Focus border |
| `--accent-tint` | `rgba(11, 92, 171, 0.08)` | Button fills, focus ring, hover reveals |
| `--success` | `#34c759` | Live/available status dot |
| `--danger` | `#d63a2f` | Errors |
| `--danger-light` | `#f2a39c` | Error field borders |
| `--danger-tint` | `rgba(214, 58, 47, 0.08)` | Error focus ring |
| `--focus-ring` | `0 0 0 3px var(--accent-tint), 0 0 0 1px var(--accent-light)` | Shared focus style |
| `--disabled-opacity` | `0.45` | All disabled states |
| `--selection-bg` | `rgba(11, 92, 171, 0.18)` | ::selection |

### Neutrals & lines
| Token | Value | Use |
|-------|-------|-----|
| `--neutral-light` | `#eef3f8` | Light fill (secondary/ghost buttons) |
| `--hairline` | `rgba(15, 23, 42, 0.10)` | Dividers, table rules |
| `--hairline-soft` | `rgba(15, 23, 42, 0.06)` | Softer dividers |

### Glass surfaces (the core motif)
| Token | Value | Use |
|-------|-------|-----|
| `--glass-border` | `rgba(255, 255, 255, 0.82)` | 1px specular border on all glass |
| `--glass-surface` | `linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(245,250,255,0.80) 55%, rgba(210,228,248,0.68) 100%)` | Panels, header bar |
| `--glass-surface-strong` | `linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,255,255,0.90) 50%, rgba(219,229,240,0.80) 100%)` | Glass buttons, floating pills |
| `--surface-flat` | `rgba(255, 255, 255, 0.78)` | Form fields, chips (non-gradient) |
| `--glass-sheen` | `linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.35) 28%, rgba(255,255,255,0) 100%)` | ::before overlay, `mix-blend-mode: screen` |
| `--glass-inset` | `inset 0 1px 0 rgba(255,255,255,0.60), inset 0 -1px 0 rgba(15,23,42,0.04)` | ::after overlay ring, `mix-blend-mode: screen` |

### Blur recipes
| Token | Value | Use |
|-------|-------|-----|
| `--blur-sm` | `blur(18px)` | Chips, badges, form fields |
| `--blur-md` | `blur(22px)` | Glass buttons, floating pills |
| `--glass-blur` | `blur(28px) saturate(215%)` | Panels, header — the signature |

### Elevation (flattest → most lift)
| Token | Value | Use |
|-------|-------|-----|
| `--shadow-soft` | `0 2px 8px rgba(10,22,35,0.06), 0 1px 2px rgba(10,22,35,0.04)` | Form fields |
| `--shadow-float` | `0 4px 16px rgba(10,22,35,0.10), 0 1px 4px rgba(10,22,35,0.06)` | Badges, chips |
| `--shadow-bar` | `0 4px 24px rgba(10,22,35,0.08), 0 1px 4px rgba(10,22,35,0.05)` | Header bar |
| `--shadow-panel` | `0 8px 40px rgba(10,22,35,0.10), 0 2px 8px rgba(10,22,35,0.06)` | Main glass panels |
| `--shadow-popup` | `0 8px 32px rgba(10,22,35,0.14), 0 2px 8px rgba(10,22,35,0.08)` | Glass buttons at rest |
| `--shadow-lift` | `0 12px 40px rgba(10,22,35,0.18), 0 3px 10px rgba(10,22,35,0.10)` | Hover target (paired with `--lift`) |

### Radii (step down by role)
| Token | Value | Use |
|-------|-------|-----|
| `--radius-card` | `32px` | Glass panels |
| `--radius-bar` | `28px` | Header bar |
| `--radius-chip` | `14px` | Badges, form fields |
| `--radius-pill` | `999px` | Buttons, tags, fully-rounded |

### Typography
| Token | Value |
|-------|-------|
| `--font-display` | `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif` |
| `--font-text` | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif` |
| `--font-mono` | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` |
| `--display-weight` | `700` |
| `--display-tracking-2` | `-0.02em` (h1/section headings) |
| `--display-tracking-3` | `-0.01em` (panel headings, nav/logo) |
| `--size-section` | `clamp(2rem, 4vw, 3rem)` (page h1) |
| `--size-body` | `1.0625rem` |
| `--size-body-sm` | `0.94rem` |
| `--size-small` | `0.88rem` |
| `--size-caption` | `0.78rem` |
| `--body-leading` | `1.7` |

### Spacing, layout & z-index
| Token | Value | Use |
|-------|-------|-----|
| `--space-2xs` | `0.25rem` | Inline gap |
| `--space-xs` | `0.5rem` | Icon gap |
| `--space-sm` | `0.75rem` | Chip padding, small gaps |
| `--space-md` | `1rem` | Component gap |
| `--space-lg` | `1.25rem` | Card padding, section inner |
| `--space-xl` | `1.75rem` | Vertical rhythm |
| `--space-2xl` | `2rem` | Section gaps |
| `--pad-panel` | `clamp(1.5rem, 2vw, 1.85rem)` | Panel padding |
| `--shell-px` | `1.25rem` | Page side padding |
| `--max-width` | `1440px` | Full-shell max width (header) |
| `--content-width` | `820px` *(derived — reading column for this app; not upstream)* | `main` column |
| `--z-background` | `-1` | Fixed ambient glows |
| `--z-content` | `1` | Content above glass overlays |
| `--z-header` | `20` | Sticky header |

### Motion
| Token | Value | Use |
|-------|-------|-----|
| `--motion-fast` | `0.2s ease` | Color/opacity/shadow micro-transitions |
| `--motion-base` | `0.28s ease` | Standard hover, panel transitions |
| `--lift` | `translateY(-1px)` | Panel/link/button hover |

## 3. Components

CSS recipes live in `app/globals.css`; components use class names only.

### Panel (glass card) — `.panel`
The Glass "panel" variant: `--glass-surface` + `--glass-blur` + 1px `--glass-border`, `--radius-card`, `--shadow-panel`, `--pad-panel` padding. Two overlay pseudo-elements, both `mix-blend-mode: screen`: `::before` sheen (`--glass-sheen`), `::after` inset ring (`--glass-inset`). Direct children get `z-index: var(--z-content)` so content sits above the overlays. `isolation: isolate` + `overflow: hidden`.

### Header bar — `.site-header`
The Glass "bar" variant: same surface/blur/border, `--radius-bar`, `--shadow-bar`, sheen but no inset ring. Sticky (`top: var(--space-sm)`, `z-index: var(--z-header)`), floats inside the shell with side margins — not full-bleed.

### Badge — `.badge`
Frosted status chip: `--surface-flat` + `--blur-sm`, 1px `--glass-border`, `--radius-chip`, `--shadow-float`, `--size-caption` at 600 weight, `--text-subtle`. Leading 7px `--success` dot (`::before`) signals "live".

### Button — `button`
Pill CTA, "primary" variant: `--accent` text on `--accent-tint` fill, `--radius-pill`, 600 weight, md size (`0.55rem 1.15rem` padding, `--size-small`). No hue shift or scale on hover. `:focus-visible` → `--focus-ring`. `:disabled` → `--disabled-opacity` + `cursor: not-allowed`.

### Textarea — `textarea`
Frosted field: `--surface-flat` + `--blur-sm`, 1px `--glass-border`, `--radius-chip`, `--shadow-soft`, `--size-body-sm` at 1.6 leading, `--text-strong` text. Focus: border `--accent-light` + `0 0 0 3px var(--accent-tint)` added to shadow. Error state (future): swap to `--danger-light` border / `--danger-tint` ring.

### Output — `.output`
Streamed text region: `--hairline-soft` top rule, `--text-body`, pre-wrap.

### Mode badge — `.mode-badge`
Always-visible strip naming the access tier the *next* call will use: `--accent-tint` fill, 1px `--glass-border`, `--radius-chip`, `--size-small` in `--text-subtle` with the tier label in `--text-strong`. Leading 8px dot — `--success` on the live tiers (`.mode-byok`, `.mode-unlocked`), `--text-muted` on inert replay. Detail clause in `--font-mono` at `--size-caption`; the replay variant adds a full-width `.mode-cta` prompt. Honest labeling is the point: a visitor must never mistake a canned answer for a live one.

### Invite note — `.invite-note`
Outcome banner shown above the mode badge after an invite link is redeemed: `--surface-flat` fill, 1px `--glass-border`, 3px `--success` left rule, `--radius-chip`, `--size-small` in `--text-subtle`. The `.invite-note-warn` variant (expired/invalid link) swaps the rule to `--danger` over `--danger-tint`. Carries `role="status"`. A visitor arriving on a dead link must be told why they're in demo mode, never silently dropped there.

### Call stats — `.stats`
Definition list of the choke point's own per-call numbers (tier, latency, tokens in/out, model) under an answer: `--hairline-soft` top rule, `--size-caption` `--text-muted` labels over `--font-mono` `--size-small` `--text-body` values, wrapping flex row. Makes the observability claim in the intro visible rather than asserted.

## 4. Do / Don't

| ✅ Do | ❌ Don't |
|------|---------|
| Use tokens via `var(--…)` | Hardcode hex/px in components |
| Compose the glass stack (surface + blur + border + sheen) as specified | Re-implement or partially apply the glass recipe |
| Keep accent rare — text-on-tint, status dots | Solid accent fills, accent backgrounds |
| Hover = 1px lift + deeper shadow | Scale-ups, hue shifts on hover |
| Ensure 4.5:1 text contrast on glass surfaces | Body text on heavily blurred low-contrast panels |
| Sentence case; ALL-CAPS only for eyebrows | Emoji in UI copy (unicode arrows ↓ ↑ → are fine) |
| Pull new tokens from the upstream artifact by exact name | Invent token names locally |
