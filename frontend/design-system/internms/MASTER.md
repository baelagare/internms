# InternMS Design System Master Specification

**Project:** InternMS — University Internship Management & Decision-Support System
**Framework:** React 18 + Vite 5 + Tailwind CSS 3
**Phase:** 3A (Design System Foundation)
**Design Direction:** Academic & Institutional Workspace · High legibility, neutral surfaces, single primary blue accent, zero artificial clutter.

---

## 1. Design Tokens

### Color Palette (Light Mode)

| Role | Token Variable | Value | Purpose |
|---|---|---|---|
| Canvas | `--color-canvas` | `#F8FAFC` | App ground, view background |
| Surface | `--color-surface` | `#FFFFFF` | Panels, cards, modal sheets, inputs |
| Surface Subtle | `--color-surface-subtle` | `#F1F5F9` | Table headers, secondary strips, empty wells |
| Text Primary | `--color-text` | `#0F172A` | Primary content, headings, body text |
| Text Secondary | `--color-text-secondary` | `#475569` | Subtitles, field hints, column headers |
| Text Tertiary | `--color-text-tertiary` | `#64748B` | Timestamp details, subtle counts |
| Border | `--color-border` | `#E2E8F0` | Structural dividers, card borders |
| Border Strong | `--color-border-strong` | `#64748B` | Form control outlines (meets 3:1 non-text contrast) |
| Accent | `--color-accent` | `#1D4ED8` | Primary interactive elements, links |
| Accent Hover | `--color-accent-hover` | `#1E40AF` | Hover state on primary buttons |
| Accent Active | `--color-accent-active` | `#1E3A8A` | Pressed state on primary buttons |
| Accent Subtle | `--color-accent-subtle` | `#EFF6FF` | Selected navigation items, active tab count pills |
| Success Text | `--color-success` | `#166534` | Approved / Verified / Completed statuses |
| Success Surface | `--color-success-surface` | `#F0FDF4` | Success badge and notice background |
| Warning Text | `--color-warning` | `#92400E` | Waiting for review, pending decisions |
| Warning Surface | `--color-warning-surface` | `#FFFBEB` | Warning badge and notice background |
| Danger Text | `--color-danger` | `#B91C1C` | Returned for revision, rejected, destructive actions |
| Danger Surface | `--color-danger-surface` | `#FEF2F2` | Error alerts, inline validation, danger buttons |
| Info Text | `--color-info` | `#1E40AF` | Informational announcements, supervisor verified |
| Info Surface | `--color-info-surface` | `#EFF6FF` | Info badge and notice background |

### Typography Scale

- **Font Family:** System sans-serif stack (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`). Zero external font web requests.
- **Line Heights:** Generous 1.5 body for reading comfort, 1.25 for headings.


### Spacing & Layout Tokens

- **Spacing Scale:** 4px (`--space-1`), 8px (`--space-2`), 12px (`--space-3`), 16px (`--space-4`), 24px (`--space-6`), 32px (`--space-8`), 48px (`--space-12`)
- **Radii:** Controls: 6px (`rounded-control`), Panels: 8px (`rounded-panel`), Dialogs: 12px (`rounded-overlay`)
- **Shadows:** Flat 1px border default. Drop shadow strictly reserved for modal backdrop sheets (`var(--shadow-overlay)`).
- **Transitions:** 120ms (`--duration-fast`) for hover/focus, 180ms (`--duration-normal`) for modal fade. Disabled when `prefers-reduced-motion` is active.

---

## 2. Shared Component Specifications & State Coverage

Every primitive implements all meaningful interaction states:

| Component | Default | Hover | Focus-Visible | Active / Selected | Disabled | Loading | Error / Empty |
|---|---|---|---|---|---|---|---|
| **Button** | 44px min height, font-semibold, clear variant tone | Subtle color shift (120ms); no translate/scale | 2px accent outline + 2px offset + ring | Accent active fill | 55% opacity, `cursor-not-allowed` | `aria-busy="true"`, inline spinner, `loadingLabel` | Danger tone for destructive actions |
| **Field / Input / Select** | 44px min height, strong border (`#64748B`), accessible label | Border darkens slightly | 2px accent ring + outline | Text selection accent | Dimmed ground, cursor disabled | Skeletons hold geometry if loading | Border danger + light red surface + `role="alert"` |
| **StatusBadge** | Rounded pill, semibold text | Static (non-clickable) | Inherits if in link | Active border step | N/A | Pulse animation if computing | Danger tone for returned/revision/rejected |
| **DataTable** | Semantic `<table>`, `<th>` with scope="col" | Subtle row highlight | `tabIndex={0}` focus outline on scroll container | Row action button focus | Disabled pagination controls | Skeleton rows holding column count | `EmptyState` component with guidance |
| **Modal / Dialog** | Native `<dialog>`, centered, 95vw max | N/A | Escape key dismiss, focus trapped inside | Background inert | Buttons inside honor disabled | Skeleton inside if content async | Error notice rendered at top of dialog body |
| **Tabs** | Horizontal border list, 44px tab items | Text darkens | Visible focus ring on tab button | 2px solid accent bottom border, `aria-selected="true"` | Tab disabled if inaccessible | N/A | Empty state rendered inside selected panel |

---

## 3. Writing Rules & Content Standards

1. **Short, plain-language action labels:** Use active verbs ("Save changes", "Send advisory", "Add partner"). Avoid jargon ("Execute mutation", "Persist state").
2. **Accurate workflow distinctions:**
   - "Supervisor verified" must never be simplified to "Approved" while coordinator approval remains pending.
   - "Returned for changes" clearly conveys that student action is required.
3. **No fabricated statistics or placeholder copy:**
   - Real empty states ("No documents submitted yet", "No interns assigned to this company").
   - If a quota or catalog is unassigned, render `[PLACEHOLDER]` or "Unavailable" — never manufacture default 324 hours or fake coursework.

---

## 4. Accessibility Checklist (WCAG 2.1 AA Compliance)

- [x] Minimum 4.5:1 text contrast for all body copy and badges (Slate 900 on white is 15:1; Slate 600 on white is 5.4:1).
- [x] Minimum 3:1 non-text contrast for all active form control borders (`#64748B` on `#FFFFFF` is 4.6:1).
- [x] All interactive targets meet 44px × 44px touch bounding box minimum.
- [x] Visible 2px focus rings on all interactive elements via `:focus-visible`.
- [x] Semantic HTML: native `<dialog>`, `<table>`, `<th scope="col">`, `<button type="button">`.
- [x] Field errors linked via `aria-describedby` and flagged with `aria-invalid="true"` and `role="alert"`.
- [x] Respect `prefers-reduced-motion: reduce` across all transitions and animations.
- [x] Zero emojis used as icons (consistent 24×24 SVG icons throughout).

