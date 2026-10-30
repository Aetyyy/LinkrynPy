# Design System — Modern Blue

## 1. Purpose and visual direction

Build a contemporary, confident, technology-oriented interface using blue as the primary identity color. The visual character should be clean, precise, approachable, and professional—not futuristic for its own sake and not a generic SaaS template.

The system relies on:
- A restrained blue palette supported by cool neutral backgrounds.
- Strong typography and clear information hierarchy.
- Consistent spacing and alignment.
- Subtle borders and restrained elevation.
- Purposeful interaction feedback and accessible contrast.

Use this system as the default. If the project already has an established brand palette or the user supplies a reference, preserve the existing identity and adapt these tokens rather than forcing a redesign.

## 2. Color palette

### Brand blues

| Token | Hex | Intended use |
|---|---|---|
| `brand-50` | `#EFF6FF` | Very soft blue surface, selected navigation background |
| `brand-100` | `#DBEAFE` | Subtle highlight, selected row, tinted border |
| `brand-200` | `#BFDBFE` | Decorative or low-emphasis blue border |
| `brand-300` | `#93C5FD` | Non-text accents and charts |
| `brand-400` | `#60A5FA` | Secondary accents; check contrast before using for text |
| `brand-500` | `#3B82F6` | Links and medium-emphasis accents; check contrast on white |
| `brand-600` | `#2563EB` | Primary actions, active controls, key brand elements |
| `brand-700` | `#1D4ED8` | Hover/pressed primary actions and stronger emphasis |
| `brand-800` | `#1E40AF` | Deep blue emphasis |
| `brand-900` | `#1E3A8A` | Dark brand accents |

### Neutral and semantic colors

| Token | Hex | Intended use |
|---|---|---|
| `background` | `#F8FAFC` | Main application background |
| `surface` | `#FFFFFF` | Primary content surface |
| `surface-muted` | `#F1F5F9` | Muted panels, secondary areas |
| `surface-blue` | `#EFF6FF` | Selected or brand-tinted areas |
| `text` | `#0F172A` | Main text and headings |
| `text-secondary` | `#475569` | Supporting text |
| `text-muted` | `#64748B` | Metadata and low-emphasis text; check contrast for small text |
| `border` | `#E2E8F0` | Default borders and dividers |
| `border-strong` | `#CBD5E1` | Stronger boundaries when needed |
| `success` | `#15803D` | Success state |
| `warning` | `#B45309` | Warning state |
| `danger` | `#B91C1C` | Error and destructive state |
| `info` | `#1D4ED8` | Informational state |

### Color rules

- Use `brand-600` as the default primary action color with white foreground text. Use `brand-700` for hover/pressed states.
- Use dark neutral text on light surfaces for normal reading.
- Use blue-tinted backgrounds sparingly for selected states, callouts, and grouped content—not behind every section.
- Avoid using `brand-400` or lighter blues for small text on white backgrounds unless the contrast is verified.
- Do not use color alone to communicate status; include text, an icon, or another cue.
- Keep status colors semantic. Do not use green, orange, or red as decorative accents.
- Do not add a second accent color unless the content or brand genuinely needs it.

## 3. Typography

- Prefer the project's existing font if it is already consistent and readable. Otherwise use a modern sans-serif such as Geist or Inter, with system sans-serif fallbacks.
- Do not load a new external font if the project already has a suitable bundled font.
- Use a limited range of weights: regular (400), medium (500), semibold (600), and bold (700).
- Body text should normally be 14–16 px on desktop and remain comfortably readable on mobile.
- Use line-height around 1.45–1.65 for body copy and 1.1–1.3 for large headings.
- Avoid long all-caps text and excessive letter spacing.

Suggested type scale:

| Role | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Display | 48–60 px | 36–44 px | 700 |
| H1 | 36–44 px | 30–36 px | 700 |
| H2 | 28–32 px | 24–28 px | 600–700 |
| H3 | 20–24 px | 20–22 px | 600 |
| H4 | 18–20 px | 18–20 px | 600 |
| Body large | 16–18 px | 16 px | 400 |
| Body | 14–16 px | 14–16 px | 400 |
| Label / metadata | 12–13 px | 12–13 px | 500 |

Choose sizes by hierarchy, not by mechanically using every level on every page.

## 4. Spacing and layout

Use a consistent 4 px base spacing scale:

| Token | Value | Typical use |
|---|---:|---|
| `space-1` | 4 px | Tight inline gaps |
| `space-2` | 8 px | Icon-to-label, compact controls |
| `space-3` | 12 px | Dense component spacing |
| `space-4` | 16 px | Standard component padding/gaps |
| `space-5` | 20 px | Related content groups |
| `space-6` | 24 px | Card padding, section sub-groups |
| `space-8` | 32 px | Large component gaps |
| `space-10` | 40 px | Section spacing on compact pages |
| `space-12` | 48 px | Section spacing |
| `space-16` | 64 px | Major page sections |
| `space-20` | 80 px | Large desktop section separation |

Layout guidance:
- Use a centered content container with a sensible maximum width, commonly 1120–1280 px for desktop applications and content sites.
- Use responsive horizontal gutters, typically 16–24 px on mobile and 24–40 px on desktop.
- Keep forms and long reading content narrower than the full page width where appropriate.
- Use consistent grid gaps; do not create arbitrary per-element spacing values without a reason.
- Allow content density to follow the task. Data-heavy pages may be denser than marketing or editorial pages.

## 5. Shape, borders, and elevation

Suggested radius tokens:

| Token | Value | Typical use |
|---|---:|---|
| `radius-sm` | 6 px | Compact controls, small tags |
| `radius-md` | 10 px | Inputs and buttons |
| `radius-lg` | 14 px | Cards and common panels |
| `radius-xl` | 18 px | Dialogs or prominent containers |
| `radius-full` | 9999 px | Circular controls or intentionally pill-shaped elements |

Rules:
- Use `#E2E8F0` as the default subtle border color.
- Prefer a border or background separation over a shadow when either is sufficient.
- Use soft shadows only to communicate elevation (for example, menus, popovers, dialogs, or a small number of elevated surfaces).
- Do not give every card and section a shadow.
- Do not use pill shapes for every button, input, badge, or navigation item.

## 6. Component guidance

### Buttons
- Primary: brand blue background, white text, clear hover/pressed/focus/disabled states.
- Secondary: neutral or white surface with a subtle border and dark text.
- Tertiary/ghost: minimal background; reserve for low-emphasis actions.
- Destructive: semantic danger color and clear confirmation for irreversible actions.
- Typical height: 40–44 px; use 48 px for prominent touch targets when appropriate.
- Include visible labels for important actions. Icon-only buttons require an accessible name and tooltip where useful.

### Inputs and forms
- Use a clear visible label; placeholders are supplementary and must not replace labels.
- Typical control height: 42–46 px.
- Provide clear focus, invalid, disabled, and help-text states.
- Keep validation messages close to the relevant field and explain how to fix the issue.

### Cards and panels
- Use a card only when a surface meaningfully groups related information or actions.
- Prefer simple section headings, dividers, lists, or open layouts when a card would add unnecessary visual weight.
- Keep card padding proportional to content density.

### Navigation
- Make the current location obvious without relying on color alone.
- Keep navigation hierarchy shallow and labels understandable.
- On mobile, use a deliberate compact pattern rather than squeezing desktop navigation.

### Tables and data displays
- Prioritize scanability, alignment, readable row spacing, and clear column labels.
- Use subtle separators and restrained row highlighting.
- On small screens, choose a deliberate overflow, stacked, or alternate presentation; do not allow accidental page-wide overflow.

### Icons
- Use one icon family already present in the project.
- Keep stroke weight and sizing consistent.
- Use icons to clarify an action or category, not to decorate every heading.

## 7. Motion and feedback

- Use short transitions, generally 140–220 ms, for hover, focus, and small state changes.
- Prefer opacity, color, and small transform changes over large movement.
- Avoid perpetual motion, unnecessary parallax, and large entrance animations.
- Respect `prefers-reduced-motion` and provide usable non-animated states.
- Loading indicators should communicate real work; do not animate decorative elements as fake loading states.

## 8. Accessibility and contrast

- Aim for WCAG 2.2 AA contrast: 4.5:1 for normal text and 3:1 for large text and essential non-text UI indicators.
- Verify actual foreground/background combinations; do not assume a palette pairing passes.
- Provide visible keyboard focus and adequate hit areas.
- Use semantic headings in a logical order.
- Ensure forms have programmatic labels and useful error messages.
- Support zoom and narrow viewports without hiding essential content.

## 9. Suggested CSS tokens (Tailwind CSS v4 compatible)

Adapt these tokens to the project's existing CSS architecture. Do not duplicate them if equivalent semantic tokens already exist.

```css
@import "tailwindcss";

@theme {
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-800: #1e40af;
  --color-brand-900: #1e3a8a;

  --color-app-background: #f8fafc;
  --color-app-surface: #ffffff;
  --color-app-surface-muted: #f1f5f9;
  --color-app-text: #0f172a;
  --color-app-text-secondary: #475569;
  --color-app-text-muted: #64748b;
  --color-app-border: #e2e8f0;

  --radius-control: 0.625rem;
  --radius-card: 0.875rem;
  --radius-dialog: 1.125rem;

  --shadow-soft: 0 4px 16px rgb(15 23 42 / 0.06);
  --shadow-popover: 0 12px 32px rgb(15 23 42 / 0.12);
}

:root {
  color-scheme: light;
  --app-background: #f8fafc;
  --app-surface: #ffffff;
  --app-text: #0f172a;
  --app-text-secondary: #475569;
  --app-border: #e2e8f0;
}
```

Do not replace an existing global stylesheet blindly. Merge tokens carefully and confirm that generated Tailwind utilities match the installed Tailwind version.

## 10. Final design checklist

Before considering a UI task complete, verify:
- The blue identity is clear but not overwhelming.
- Neutral surfaces provide enough breathing room.
- Typography establishes a clear reading hierarchy.
- Spacing, borders, and radii are consistent.
- Cards and shadows are used selectively.
- Layout responds intentionally to mobile and desktop.
- Hover, focus, disabled, loading, and error states are handled where needed.
- Text and controls meet contrast and accessibility requirements.
- The result feels specific to the product and its content, not like a copied generic template.
