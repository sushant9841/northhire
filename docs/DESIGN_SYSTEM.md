# NorthHire — Design System Reference

Date: 2026-09-23. This document is the canonical reference for the design tokens, component primitives, and responsive conventions that drive NorthHire's visual identity and interaction patterns.

## Color Palette

The palette is structured as 60% neutral (grays), 30% ink/text hierarchy, and 10% semantic tones. All values live in `src/design/tokens.js` and are mirrored into `src/index.css`'s `@theme` block for Tailwind class generation at build time. A dev-mode check in tokens.js warns when the two drift.

### Neutrals & Grays

| Token | Value | Usage |
|-------|-------|-------|
| `brand` | #005CCC | Primary action, links, highlights — the core identity tone |
| `brandDark` | #004AA6 | Button hover state, darkened variant |
| `brandDeep` | #003B85 | Button active state, deepest blue |
| `wash` | #EDF4FF | Light background, soft tags/pills, low-emphasis fill |
| `line2` | #C9DEFF | Secondary divider, muted borders |
| `tint` | #F6FAFF | Lightest background, near-white tint |
| `ink` | #0B1220 | Darkest text, high-contrast header |
| `ink2` | #151F31 | Secondary heading, dark mode backgrounds |
| `ink3` | #2A3852 | Tertiary text, muted UI elements |
| `text` | #0E1727 | Standard body text, primary copy |
| `text2` | #4A5A73 | Secondary text, descriptions, hints |
| `text3` | #8493A9 | Tertiary text, placeholders, disabled state |
| `line` | #E3E8EF | Primary divider, borders, subtle separators |
| `lineSoft` | #EEF1F6 | Softest divider, very subtle separation |
| `bg` | #F7F9FC | Page background, hover states, low-emphasis surfaces |
| `surface` | #FFFFFF | Card background, modal surfaces, input fields |

### Semantic Tones

Each semantic tone follows a `{tone}`, `{tone}Bg`, `{tone}Ln` triad (text, background, line).

| Tone | Text | Background | Line | Usage |
|------|------|------------|------|-------|
| `ok` | #07724F | #E9F7F1 | #B3E3D1 | Success, positive state (green) |
| `warn` | #8F5B05 | #FDF5E6 | #F0DDB0 | Warning, caution (amber) |
| `red` | #AE2119 | #FDF0EF | #F5CDC9 | Error, danger, destructive (red) |
| `violet` | #5B3BC4 | #F1EDFD | #D9CFFA | Special/rare features (purple) |

Additional dashboard-specific accents (not in core palette):
- `accent` #6AACFF — HR Shell sidebar highlights
- `amber` #F5A524 — Locked feature badges
- `staffing` #D97706 — Staffing console branding

## Shadow Scale

Shadows use a consistent elevation scale built from `rgba(11,18,32,...)` (the ink color at alpha). Use sparingly; most UI surfaces use borders instead.

| Token | Value | Elevation |
|-------|-------|-----------|
| `xs` | 0 1px 2px rgba(11,18,32,.05) | Subtle depth, hover states |
| `sm` | 0 2px 8px rgba(11,18,32,.07) | Card depth, slight lift |
| `md` | 0 8px 26px rgba(11,18,32,.10) | Modal/drawer, moderate depth |
| `lg` | 0 20px 56px rgba(11,18,32,.18) | Tall elevation, focus takeover |

## Typography

Font stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### Scale (Tailwind utilities)

The app uses Tailwind's default text-size scale (text-xs through text-3xl). Key hierarchy:

| Context | Utility | Weight | Usage |
|---------|---------|--------|-------|
| Page H1 | text-4xl | font-bold | Hero headings (title + optional action row) |
| Page H2 | text-2xl | font-bold | Section headers (title + optional subtitle) |
| Card H3 | text-lg | font-bold | Card headers, modal titles |
| Body | text-base | font-normal | Standard paragraph, description |
| Small | text-sm | font-normal | Secondary copy, hints |
| Tiny | text-xs | font-normal | Labels, badges, metadata |

**Classes to align hierarchy:**
- `HERO_TIGHT` = extrabold + tracking-tighter + leading-none — standard detail-page hero titles
- `HERO_WIDE` = extrabold + tracking-tight + leading-none — top-of-funnel mega hero titles
- `HERO_WRAP` = extrabold + tracking-tight + leading-tight — hero titles that may wrap to 2+ lines
- `HERO_QUIET` = font-bold + tracking-tight — de-emphasized utility-page h1s (legal docs, confirmation screens)
- `SECTION_CLS` = font-bold + text-text + tracking-tight — in-page section headers (callers add their own leading)

## Core Primitives

All primitives are in `src/design/primitives.jsx` and exported for use across the app.

### Button (`<Btn />`)

```jsx
<Btn kind="primary" size="md" full={false} icon="check" onClick={handleClick} disabled={false} loading={false}>
  Button Text
</Btn>
```

**Props:**
- `kind` — "primary" (blue fill), "dark" (ink fill), "soft" (wash fill), "outline" (border only), "ghost" (transparent), "ok" (green), "danger" (red), "dangerSoft" (red wash), "onDark" (white translucent on dark bg)
- `size` — "xs" (text-xs, py-2), "sm" (text-sm, py-2.5), "md" (text-sm, py-3), "lg" (text-base, py-4)
- `full` — stretch to container width (boolean)
- `icon` / `iconR` — icon name (left / right of text, imported from `src/design/icons.jsx`)
- `loading` — shows spinner, disables button (boolean)
- `disabled` — opacity-45, no events (boolean)
- `className` — merge additional Tailwind classes

**Behavior:**
- Hover: `-translate-y-1px` lift, color shift per kind
- Active: `scale-95` press feedback
- Focus: 2px outline in brand color (via global :focus-visible rule)
- Never renders fixed width — button size is content + padding

### Card (`<Card />`)

```jsx
<Card onClick={handleClick} hover pad={24} className="custom-class">
  Content here
</Card>
```

**Props:**
- `onClick` — optional click handler (makes card keyboard-operable via clickableA11y helper)
- `hover` — adds hover state (border-line → border-line-2, shadow-md, -translate-y-1)
- `pad` — padding in px (default 24)
- `className` / `style` — additional styling

**Structure:**
- bg-white, border border-line, rounded-2xl
- If clickable: cursor-pointer, role="button", tabindex="0", keyboard Enter/Space support

### Tag (`<Tag />`)

```jsx
<Tag tone="brand" icon="check" sm={false}>
  Label
</Tag>
```

**Props:**
- `tone` — "neutral" | "brand" | "ok" | "warn" | "danger" | "violet" | "dark" | "onDark"
- `icon` — optional icon name
- `sm` — smaller padding (py-1 px-2 vs py-1.5 px-2.5)

**Structure:**
- Inline-flex, border, rounded-lg, text-xs, font-semibold
- Uses TONE_SOFT map: soft background + text + border triad per tone

### Input (`<Input />`)

```jsx
<Input
  type="text"
  placeholder="..."
  icon="search"
  suffix="€"
  invalid={hasError}
  onChange={handleChange}
/>
```

**Props:**
- `type` — "text" | "email" | "password" | "date" | "number" etc. (password type toggles show/hide)
- `icon` — optional left icon
- `suffix` — optional right text (e.g. currency)
- `invalid` — red border + error ring on true
- Standard `onChange`, `value`, `disabled`, `name`, `required` etc.

**Structure:**
- `inp` class = w-full + bg-white + border-line + rounded-xl + py-3.5 px-4
- Focus: border-brand + ring-4 ring-wash
- Icon/suffix: absolutely positioned, pointer-events-none for icons

### Textarea (`<Area />`)

Same as Input but resizable, multi-line. Suffix/icon same behavior.

### Select (`<Sel />`)

Native `<select>` styled with:
- Custom dropdown arrow (CSS gradient, not browser default)
- Focus ring same as Input
- Invalid state same as Input

### Field (`<Field />`)

Wrapper for label + input + error/hint:

```jsx
<Field label="Email" required error={errorMsg} hint="We'll verify this" name="email">
  <Input type="email" />
</Field>
```

**Props:**
- `label` — renders as `<label>` with required indicator
- `error` — shows error message in red (shakes on mount)
- `hint` — shows under input in text-3 if no error
- `name` — used for `data-field-error` attribute (scrollToError helper finds this)

### Switch (`<Switch />`)

Toggle switch:

```jsx
<Switch on={isOn} onChange={handleChange} disabled={false} />
```

### CheckRow (`<CheckRow />`)

Checkbox-like control, full-width row:

```jsx
<CheckRow
  on={isChecked}
  onChange={handleChange}
  label="Accept terms"
  sub="Optional sub-text"
  disabled={false}
/>
```

### Modal (`<Modal />`)

Full-screen centered dialog:

```jsx
<Modal open={isOpen} onClose={handleClose} title="Confirm" sub="Are you sure?" width={520} footer={<Btn>OK</Btn>}>
  Content here
</Modal>
```

**Props:**
- `open` — show/hide (boolean, required)
- `onClose` — close handler (called on Escape, outside click, close button)
- `title` / `sub` — header text
- `footer` — optional button row at bottom
- `width` — px width on desktop (mobile is full-width bottom-sheet)

**Behavior:**
- Centering on desktop (pop animation)
- Bottom-sheet on mobile ≤900px (up animation)
- Escape key closes
- Tab focus trapped within dialog
- Body overflow hidden while open
- Portal to body (z-[700])

### BottomSheet (`<BottomSheet />`)

Mobile-first drawer:
- Mobile ≤900px: bottom-sheet animation
- Desktop: right-side slide-in drawer (width=420px)
- Same header/footer/close behavior as Modal

```jsx
<BottomSheet open={isOpen} onClose={handleClose} title="Filters" width={420}>
  Filter controls
</BottomSheet>
```

### SuccessCard (`<SuccessCard />`)

Rich confirmation for major actions (apply submitted, job published, offer sent):

```jsx
<SuccessCard
  title="Application submitted"
  subtitle="We'll notify you when employers respond"
  tone="ok"
  icon="check"
  actions={[<Btn onClick={handleNext}>View status</Btn>]}
>
  <div>Additional confirmation details</div>
</SuccessCard>
```

**Props:**
- `tone` — "ok" (green checkmark) | "brand" (blue, "not final yet" moments)
- `icon` — icon name (default "check")
- `actions` — array of Btn components
- `children` — optional card content below title

**Structure:**
- Animated checkmark ring (pop animation)
- Title + subtitle centered
- Optional detail card below
- Action buttons centered, flex-wrap

### Empty (`<Empty />`)

Empty state with icon + title + body + CTA:

```jsx
<Empty
  icon="search"
  title="No results"
  body="Try a different search query"
  action={<Btn>Clear filters</Btn>}
/>
```

### Banner (`<Banner />`)

Notification banner (contextual, inline):

```jsx
<Banner tone="warn" icon="alert" title="Action needed">
  Your subscription expires tomorrow
</Banner>
```

Uses TONE_SOFT map, same as Tag. Optional `onClose` button.

### Stat (`<Stat />`)

Dashboard metric card:

```jsx
<Stat
  label="Applications"
  value="42"
  tone={C.brand}
  icon="inbox"
  delta="+5 this week"
  deltaTone="ok"
  spark={[10, 15, 12, 18, 22]}
  onClick={handleClick}
/>
```

**Props:**
- `spark` — array of numbers, rendered as tiny inline sparkline
- `deltaTone` — "ok" (green) | "warn" (amber) | "down" (red)
- Clickable (button role, hover state)

### Ring (`<Ring />`)

Circular progress indicator:

```jsx
<Ring v={85} size={46} label="85%" />
```

Color auto-scales: red (<65%), brand (65-85%), ok (≥85%)

### Bar (`<Bar />`)

Linear progress bar:

```jsx
<Bar v={65} tone={C.brand} h={6} />
```

### Tabs (`<Tabs />`)

Tab switcher with arrow-key navigation:

```jsx
<Tabs
  items={[
    { k: "tab1", label: "Tab 1", icon: "inbox", n: 3 },
    { k: "tab2", label: "Tab 2", icon: "archive" },
  ]}
  value={activeTab}
  onChange={setActiveTab}
/>
```

**Props:**
- `items` — array of {k, label, icon?, n?} (n = badge count)
- `value` — active key
- `onChange` — callback

**Behavior:**
- Arrow Right/Left to navigate
- Active tab: bold + brand color + wash bg
- Badge optional (n > 0 shown as small pill)

### FeatureBoundary (`<FeatureBoundary />`)

Plan-gating wrapper — renders children when feature is available, otherwise a locked state:

```jsx
<FeatureBoundary A={store} feature="interviews" as="banner" label="Interviews">
  <InterviewsPanel />
</FeatureBoundary>
```

**Props:**
- `A` — the store (contains user plan, `can()` method)
- `feature` — feature name (e.g. "interviews", "csvImport")
- `as` — "inline" (small pill), "card" (bordered box), "banner" (full-width)
- `children` — content to show when available
- `fallback` — optional fallback when locked
- `label` / `icon` / `requiredPlan` — passed to upgrade modal

**Behavior:**
- `A.can(feature)` checks if available
- If locked, opening the control triggers `A.requestUpgrade(feature, label, icon)`
- Server-side enforcement on every gated endpoint is the real boundary; this is UX-only

### UserAvatar (`<UserAvatar />`)

User's uploaded photo or initials badge:

```jsx
<UserAvatar user={userObj} size={40} radius={12} />
```

- Real uploaded photo (from `user.photo`) if present
- Falls back to initials on deterministic colored background
- Falls back to "?" if no name
- No third-party image CDNs (randomuser.me removed)

### RichText (`<RichText />`)

WYSIWYG editor used in CV builder, job posting, training content:

```jsx
<RichText
  value={htmlContent}
  onChange={setHtmlContent}
  placeholder="Start typing..."
  rows={6}
  minHeight={400}
/>
```

**Toolbar:**
- Bold, Italic, Underline, Link, Ordered/Unordered List, Image
- Images embedded as base64 data: URIs (max 2MB per image)
- Source mode toggle for raw HTML editing
- Text selection saved/restored when modals open

### DatePicker (`<DatePicker />`)

Native `<input type="date">` with validation:

```jsx
<DatePicker value="2026-09-23" onChange={handleChange} min="2026-01-01" max="2026-12-31" />
```

**Behavior:**
- Browser picker UI on all platforms
- Manual typing validated: out-of-range values clamped to min/max
- Placeholder attribute not used (browser doesn't support it on date inputs)

### DateRangePicker (`<DateRangePicker />`)

From/To date range control with presets:

```jsx
<DateRangePicker
  from={from}
  to={to}
  onChange={({from, to}) => setDates({from, to})}
  min="2026-01-01"
  max="2026-12-31"
  presets={true}
/>
```

**Presets:**
- Last 7 days, 30 days, 90 days, Year to date, Last 12 months
- Resolved at click time (not cached, stays fresh in long-open tabs)

**Behavior:**
- Swaps from/to if range inverted by user
- Clear button shows when either field is set

## Responsive Design

NorthHire uses a custom `mob` breakpoint (900px max-width) instead of Tailwind's default sm:/md:. This is driven by the `useMedia("(max-width: 900px)")` hook (defined in `src/helpers/hooks.js`), which returns a boolean you can conditionally render on.

### Why 900px?

The dashboard shells (Employer, HR, Admin) have fixed-width sidebars that make the main content area too narrow below 1200px desktop. A hard cutover at 900px is where mobile layout kicks in app-wide. Pages respond with:
- Full-width mobile layout (single column)
- Desktop multi-column layout (sidebar nav on left, content on right)

### Tailwind Breakpoint Not Used

Do NOT use Tailwind's `sm:`, `md:`, `lg:` breakpoints for mobile layout. Instead:
1. Write the mobile-first CSS (no prefix = base styles)
2. Check `const mob = useMedia("(max-width: 900px)")` in the component
3. Conditionally render or apply different className based on `mob`

Example:

```jsx
const mob = useMedia("(max-width: 900px)");
return (
  <div className={mob ? "px-4" : "px-8"}>
    {mob && <MobileNav />}
    {!mob && <DesktopNav />}
  </div>
);
```

### Container Widths

All pages use `<Page>` wrapper with max-width tokens:

| Token | Value | Usage |
|-------|-------|-------|
| `max-w-site` | 1240px | Default page width |
| `max-w-narrow` | 820px | Content-heavy pages (legal docs, article views) |
| `max-w-wide` | 1360px | Data-heavy pages (analytics, reports) |

Padding:
- Mobile: px-4 (16px) + py-8 (pad-top) + pb-12 (footer breathing room)
- Desktop: px-8 (32px) + py-14 + pb-20

No page should use fixed pixel widths for anything meant to reflow. Use Tailwind's flex/gap/max-w utilities or Grid.

## Image Handling

All images use `SmartImg` component: tries the real URL first, silently falls back to SVG if it 404s or times out (network blocked).

### Logos

`<SmartLogo e={employer} size={46} radius={12} />`
- Real logo from `employer.logo` URL
- Falls back to initials mark (from `employer.mark` and colors `a`, `b`)
- No Clearbit CDN (blocked by adblockers)

### Portraits

`<Portrait seed={0} size={48} radius={999} />`
- Deterministic SVG based on seed
- No randomuser.me third-party CDN
- Same for `<SmartPortrait />`

### Scenes

`<Scene kind="office" tone={C.brand} w="100%" h={180} />`
- Real Unsplash photo first (via `sceneUrl()`)
- Falls back to stylized SVG scene
- Kinds: trades, care, road, office, kitchen, warehouse, learn, money, resume, safety

### Job Scenes

`<SceneSvg kind="office" tone={tone} />` (pure SVG, no fallback)

Used for empty states, category illustrations, training hero images.

## Container & Layout Tokens

```javascript
export const MAXW = { site: 1240, narrow: 820, wide: 1360 };
export const PADX = { mob: "16px", dt: "32px" };
```

## Key Rules

1. **No third-party image CDNs.** SmartImg always has an SVG fallback. Clearbit, randomuser.me, etc. removed.
2. **Colors via tokens.** Use `C.brand`, `C.text`, etc. from `src/design/tokens.js`, not arbitrary hex strings.
3. **Buttons never have fixed width.** Size by content + padding.
4. **Mobile breakpoint is 900px.** Use `useMedia("(max-width: 900px)")`, not Tailwind sm:/md:.
5. **Rich content needs `.rich-content` class.** RichText's dangerouslySetInnerHTML outputs reset `<ul>/<ol>/<a>` — apply the class so bullets/numbers/links render.
6. **Focus rings on all interactive elements.** Global `:focus-visible` rule applies 2px brand outline with 4px offset. Custom ring only when really needed (segmented control, etc.).
7. **Shadows for elevation, not borders.** Most surfaces use borders (border-line). Shadows for modals/dropdowns/top-layer UI.
8. **Density via padding, not font size.** Keep text sizes consistent; adjust spacing (py-, px-) for density.
