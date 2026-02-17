# Design System

Visual language for Cortex — futuristic, functional, dark-first.

## Principles

| Principle | Meaning |
|-----------|---------|
| **Dark-first** | Optimized for dark mode, light mode fully supported |
| **Glass morphism** | Frosted glass surfaces with subtle blur |
| **Glow accents** | Subtle neon-esque glows for emphasis |
| **Keyboard-first** | Everything accessible via keyboard |
| **Information-dense** | Respect screen real estate, no wasted space |
| **Consistent** | Same patterns everywhere |

## Tech Stack

- **Tailwind CSS 4** — Utility-first
- **shadcn/ui** — New York style, neutral base
- **OKLCH colors** — Perceptually uniform, modern
- **Lucide icons** — Clean, consistent iconography
- **Geist fonts** — Sans + Mono

## Color System

Using OKLCH for perceptually uniform colors.

### Dark Mode (Primary)

```css
--background: oklch(0.13 0.015 265);      /* Deep blue-gray */
--foreground: oklch(0.93 0 0);            /* Near white */

--card: oklch(0.17 0.015 265 / 40%);      /* Elevated surface */
--card-foreground: oklch(0.93 0 0);

--primary: oklch(0.78 0.15 195);          /* Cyan/teal */
--primary-foreground: oklch(0.13 0.015 265);

--secondary: oklch(0.21 0.012 265);
--secondary-foreground: oklch(0.88 0 0);

--muted: oklch(0.21 0.012 265);
--muted-foreground: oklch(0.65 0 0);

--accent: oklch(0.25 0.010 265);
--accent-foreground: oklch(0.93 0 0);

--destructive: oklch(0.65 0.22 25);       /* Red */

--border: oklch(1 0 0 / 8%);
--input: oklch(1 0 0 / 10%);
--ring: oklch(0.78 0.15 195);             /* Focus ring = primary */

/* Special */
--glow: oklch(0.78 0.15 195 / 15%);       /* Glow effect */
--glow-muted: oklch(0.78 0.15 195 / 8%);
--surface: oklch(0.17 0.015 265 / 60%);   /* Glass surface */
```

### Light Mode

```css
--background: oklch(0.97 0.005 265);      /* Off-white */
--foreground: oklch(0.15 0.01 265);       /* Near black */

--card: oklch(1 0 0 / 70%);
--card-foreground: oklch(0.15 0.01 265);

--primary: oklch(0.45 0.18 265);          /* Deeper for contrast */
--primary-foreground: oklch(0.98 0 0);

--secondary: oklch(0.93 0.005 265);
--secondary-foreground: oklch(0.25 0.01 265);

--muted: oklch(0.93 0.005 265);
--muted-foreground: oklch(0.45 0.01 265);

--border: oklch(0 0 0 / 8%);
--input: oklch(0 0 0 / 8%);

--glow: oklch(0.55 0.15 195 / 15%);
--surface: oklch(1 0 0 / 50%);
```

### Color Hues

| Purpose | Hue | Usage |
|---------|-----|-------|
| **Primary (cyan)** | 195 | Actions, links, focus |
| **Background (purple-gray)** | 265 | Base surfaces |
| **Destructive (red)** | 25 | Errors, delete |
| **Success (green)** | 155 | Confirmations |
| **Warning (orange)** | 55 | Caution states |
| **Accent (purple)** | 295 | Gradients, highlights |

## Typography

### Font Stack

```css
--font-sans: 'Geist Sans', system-ui, sans-serif;
--font-mono: 'Geist Mono', monospace;
```

### Scale

| Name | Size | Weight | Usage |
|------|------|--------|-------|
| **xs** | 12px | 400 | Captions, timestamps |
| **sm** | 14px | 400/500 | Secondary text, labels |
| **base** | 16px | 400 | Body text |
| **lg** | 18px | 500 | Subheadings |
| **xl** | 20px | 600 | Section headers |
| **2xl** | 24px | 600 | Page titles |

### Special Styles

```css
/* Gradient text for branding */
.gradient-text {
  background: linear-gradient(135deg, oklch(0.78 0.15 195), oklch(0.65 0.20 295));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

## Spacing

Based on 4px grid:

| Token | Value | Usage |
|-------|-------|-------|
| `1` | 4px | Tight spacing |
| `2` | 8px | Element gaps |
| `3` | 12px | Card padding |
| `4` | 16px | Section gaps |
| `6` | 24px | Large gaps |
| `8` | 32px | Section margins |

## Border Radius

```css
--radius: 0.625rem;  /* 10px base */

--radius-sm: calc(var(--radius) - 4px);   /* 6px */
--radius-md: calc(var(--radius) - 2px);   /* 8px */
--radius-lg: var(--radius);               /* 10px */
--radius-xl: calc(var(--radius) + 4px);   /* 14px */
```

## Glass Effects

Core visual pattern — frosted glass surfaces.

```css
/* Primary glass surface */
.glass {
  background: var(--surface);
  backdrop-filter: blur(20px) saturate(1.5);
}

/* Card-level glass */
.glass-card {
  background: var(--card);
  backdrop-filter: blur(12px) saturate(1.3);
}

/* Interactive elements */
.glass-interactive {
  backdrop-filter: blur(8px);
}
```

## Glow Effects

Subtle neon accents for emphasis.

```css
/* Standard glow */
.glow {
  box-shadow: 0 0 20px var(--glow);
}

/* Subtle glow */
.glow-sm {
  box-shadow: 0 0 10px var(--glow-muted);
}

/* Border glow (cards, focus) */
.glow-border {
  box-shadow: 0 0 15px var(--glow-muted), inset 0 0 12px var(--glow-muted);
}

/* Focus state */
.glow-focus {
  box-shadow: 0 0 0 3px var(--glow);
}
```

## Components

### Buttons

```tsx
// Primary action
<Button>Save changes</Button>

// Secondary
<Button variant="secondary">Cancel</Button>

// Destructive
<Button variant="destructive">Delete</Button>

// Ghost (minimal)
<Button variant="ghost">Edit</Button>

// With icon
<Button>
  <Plus className="size-4 mr-2" />
  Add task
</Button>
```

### Cards

```tsx
<div className="glass-card rounded-lg border p-4">
  {/* Card content */}
</div>
```

### Active/Selected States

```tsx
// Navigation item
className={cn(
  "rounded-lg px-3 py-2 transition-all",
  isActive
    ? "bg-primary/10 text-primary"
    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
)}
```

### Inputs

```tsx
<Input 
  className="bg-input/50 border-border focus:ring-2 focus:ring-ring"
  placeholder="Search..."
/>
```

## Icons

Using Lucide icons consistently.

| Context | Size |
|---------|------|
| Inline with text | 16px (`size-4`) |
| Buttons | 16px (`size-4`) |
| Navigation | 16-20px (`size-4` to `size-5`) |
| Empty states | 48px (`size-12`) |

## Motion

### Transitions

```css
/* Standard transition */
transition-all duration-150

/* Sidebar/panel transitions */
transition-all duration-200

/* Subtle hover */
transition-colors duration-100
```

### Reduced Motion

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .glow, .glow-sm, .glow-border {
    box-shadow: none;
  }
  .glass, .glass-card {
    backdrop-filter: none;
  }
}
```

## Layout Patterns

### Sidebar + Content

```
┌──────────┬────────────────────────────────┐
│          │                                │
│ Sidebar  │         Main Content           │
│  (48px   │                                │
│   or     │                                │
│  192px)  │                                │
│          │                                │
└──────────┴────────────────────────────────┘
```

### List Views

```
┌─────────────────────────────────────────┐
│ Section Header                      [+] │
├─────────────────────────────────────────┤
│ ○ List item with checkbox           ... │
│ ● Completed item                    ... │
│ ○ Another item                      ... │
└─────────────────────────────────────────┘
```

## Priority Colors

| Priority | Color | CSS |
|----------|-------|-----|
| P0 (Critical) | Red | `text-red-500` / `bg-red-500/10` |
| P1 (High) | Orange | `text-orange-500` / `bg-orange-500/10` |
| P2 (Normal) | Yellow | `text-yellow-500` / `bg-yellow-500/10` |
| P3 (Low) | Blue | `text-blue-500` / `bg-blue-500/10` |

## Status Colors

| Status | Visual |
|--------|--------|
| Inbox | Muted, no badge |
| Today | Primary accent |
| Upcoming | Default |
| Someday | Muted |
| Completed | Strikethrough, muted |
