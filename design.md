# DESIGN.md: Department Budget Spending Tracker (Frontend)

Instructions for AI coding agents. Apply this visual style to the React frontend in `frontend/`. Read `techstack.md` first: the stack, routes, API and behavior there take precedence over anything in this file. This file changes how the app looks, not what it does.

**Rules of engagement**
- Inspect the existing frontend before changing anything. Preserve its stack, copy, routes and behavior.
- Follow the existing component and styling conventions (Material UI or Tailwind, whichever the project already uses). Do not add the other one.
- Framework, library and page examples in this file are illustrations. They do not require a stack change or new sections.
- Scope changes to the requested work. Do not restyle screens that were not asked for.
- Keep controls keyboard accessible, focus visible, text legible, reading order intact, responsive behavior intact, and reduced-motion preferences honored.
- Verify real states (hover, focus, pressed, disabled, loading, empty, error) at the rendered width.

---

## 1. Identity

An open, light interface with dark, tightly set sans-serif headings and one clear electric-blue action color. Broad reading areas sit beside compact data views. Rounded white cards on pale fields. Two substantial dark passages where they help (for example the login or landing screen and the footer). Practical and easy to scan: this is a finance tool, so numbers and status must be readable at a glance.

---

## 2. Design tokens (authoritative)

Define these once as CSS variables in `frontend/src/styles/tokens.css` (imported in the app entry). Then map them into the theme: MUI `createTheme` palette and typography, or Tailwind `theme.extend`. Never hard-code the hex values in components.

```css
:root {
  --dp-color-ground: #fcfcfd;            /* near-white page */
  --dp-color-ink: #16191f;               /* primary text */
  --dp-color-ink-secondary: #454c58;     /* supporting text */
  --dp-color-ground-muted: #f3f4f6;      /* shared pale fields */
  --dp-color-rule: #dde0e6;              /* borders and dividers */
  --dp-color-accent: #074ce0;            /* actions, small icons, selected states */
  --dp-color-field: #16191f;             /* dark fields */
  --dp-color-on-field: #fcfcfd;          /* text on dark */
  --dp-color-on-field-secondary: #d0d4dd;/* supporting text on dark */
  --dp-color-panel: #ffffff;             /* white cards */
  --dp-color-on-accent: #ffffff;         /* text on blue */

  --dp-typography-fallback: sans-serif;
  --dp-typography-body: 16px;
  --dp-typography-interface: 15px;
  --dp-typography-small: 14px;
  --dp-typography-metadata: 13px;
  --dp-typography-label: 12px;
  --dp-typography-body-leading: 1.6;

  --dp-spacing-grid-gap: 24px;
  --dp-radius-panel: 12px;
  --dp-border-hairline: 1px;
  --dp-motion-interaction: 160ms;
  --dp-motion-easing: ease-out;
}
```

Usage map:

| Token | Use for |
| --- | --- |
| ground | Page background |
| ground-muted | Shared pale fields behind groups of cards, table header rows, empty states |
| panel | Cards, forms, tables, dialogs |
| ink / ink-secondary | Primary / supporting text |
| rule | Card borders, table row rules, dividers |
| accent | Primary buttons, links, selected tab or filter, small icons, focus ring, key chart series |
| field / on-field / on-field-secondary | Dark passages and the footer |
| on-accent | Text and icons on blue buttons |

---

## 3. Typography

- **Host Grotesk**: display, headings, quotations and large figures (budget totals, utilisation percentages).
- **Instrument Sans**: paragraphs, labels, form fields, table text and controls.
- Load both fonts directly (a Google Fonts `<link>` in `index.html` or `@fontsource` packages). The `--dp-typography-fallback` token alone does not select them. Use `font-display: swap`.
- Headings: bold, tight tracking (about -0.02em), compact line-height (about 1.1 to 1.2).
- Body: `--dp-typography-body` with `--dp-typography-body-leading`. Tables and dense forms use `--dp-typography-interface` or `--dp-typography-small`.
- Labels and metadata: `--dp-typography-metadata` or `--dp-typography-label`. Smaller, but never lower contrast (still ink-secondary or better).
- Intro text gets a wider measure than card descriptions (about 65ch vs about 40ch).
- Numbers: use tabular figures (`font-variant-numeric: tabular-nums`) in tables and dashboard cards so columns align. Format rupees with Indian grouping via `utils/currency.js` (for example `8,00,000`).

---

## 4. Layout and page rhythm

Use a single content width for the whole app (for example `max-width: 1200px`, centered). Align every section to it.

**Opening area of key screens:** a wide text column beside a smaller product diagram, roughly a 1.45 : 1 split. In this app that applies to the login screen and the Management dashboard header (title, short explanation, and facts beside a diagram of the budget flow). Place supporting facts in a ruled strip below when real data exists (for example Allocated, Committed, Spent, Available for the college).

**Background continuity (adapt to the real screens):**
- Pale-grey field (`ground-muted`) behind groups of short explanations and editorial cards, such as the department summary cards.
- One continuous dark field (`field`) can carry a process and its supporting points, such as the "how the budget works" walkthrough on the landing or help screen.
- A pale comparison or disclosure area (budget vs actual, FAQ or help) can lead into the dark footer.

**Available patterns (use only where content fits):**
- Three-column feature grid.
- Equal cards in a row: the four department cards (ET, Pharma, HM, MT), equal width and height.
- Numbered process steps linked across a row: the budget lifecycle (Proposal, Finance review, Management decision, Frozen, then Request, Approvals, Committed, Paid).
- Heading beside a two-column list.

**Hero / product diagram:** an illustration of several inputs converging on a central product. In this app: Departments (ET, Pharma, HM, MT) converging on the budget control engine in the blue center. Use only real concepts from the project. Do not invent product screens, numbers or testimonials.

**Application screens (dashboard, budget forms, expense lists, reports):** keep the same tokens. Use a left navigation or top bar on `panel` with a `rule` border, content on `ground`, cards on `panel`. Data tables are `panel` cards with a `ground-muted` header row, `rule` row dividers and right-aligned numeric columns.

---

## 5. Surfaces and cards

- Cards: `panel` background, `--dp-radius-panel` radius, `1px` `rule` border, soft downward shadow (for example `0 1px 2px rgb(22 25 31 / 0.06), 0 8px 24px rgb(22 25 31 / 0.06)`).
- Not every section is a card. Prose, filters and page headers sit directly on the field.
- Product diagram: blue center with a slight material gradient (accent to a slightly lighter or darker tone of itself), light orbit lines in `rule`, small white tiles. Keep this dimensional treatment local to the diagram. Broad reading fields stay flat and quiet.
- Dark fields: `field` background, `on-field` text, `on-field-secondary` supporting text. Use at most two substantial dark passages per page.

---

## 6. Components

**Buttons**
- Primary: accent fill, `on-accent` text. Secondary: pale outlined (panel or transparent, `rule` border, ink text).
- Modest corner radius (about 8px), Instrument Sans label, padding enough for a 44px touch target.
- Hover: lift 1px (`translateY(-1px)`) and shift fill slightly. Pressed: return to rest position. Transition `--dp-motion-interaction` with `--dp-motion-easing`.
- Always keep a visible focus outline (2px accent outline with 2px offset; on dark fields use `on-field`).
- Disabled and loading states must be visible and not rely on color alone.

**Forms (budget proposal, expense request, payment entry)**
- Labels above fields in `--dp-typography-label` or metadata size, ink-secondary.
- Inputs on `panel`, `rule` border, accent border and focus ring on focus. Inline error text beneath the field in ink with an error icon (see status section).
- Show the category's Available balance next to the amount field in an expense request; update it as the user types.
- File upload for bills: a bordered drop area, shows file name and size, and an accessible remove button.

**Tables and lists**
- Aligned columns, numeric columns right-aligned with tabular figures, sticky header on long lists, pagination controls below.
- Row actions (approve, reject, pay) are secondary buttons; the single main action per row context may be primary.

**Comparison and selection**
- Budget vs actual or category comparison cards share aligned figures and lists.
- A featured card keeps its border and badge even when another option is selected. The chosen control gets the accent fill and explicit selected semantics (`aria-pressed`, `aria-selected` or `aria-current`, as appropriate).

**Disclosures**
- For help or FAQ content use native `<details>/<summary>` with ruled rows and a plus icon that rotates 45 degrees when open. Include only if the screen needs it.

**Charts (Recharts)**
- Primary series in accent. Additional series in ink-secondary and `rule`-tone neutrals; avoid adding new hues.
- Gridlines in `rule`, labels in metadata size and ink-secondary, tooltip as a small `panel` card.
- Every chart has a text title and an accessible data table or summary (`aria-label` plus a visually hidden table).

---

## 7. Budget status display (the one controlled exception to "no extra colors")

Budget thresholds and document statuses (DRAFT, APPROVED, Warning, Critical) must be distinguishable. Keep this contained:

- **Design Decision (Option A Chosen):** Defined controlled, muted status tokens in `tokens.css` (`--dp-color-status-draft`, `--dp-color-status-draft-bg`, `--dp-color-status-approved`, `--dp-color-status-approved-bg`, `--dp-color-status-submitted`, `--dp-color-status-submitted-bg`, `--dp-color-status-review`, `--dp-color-status-review-bg`, `--dp-color-status-warning`, `--dp-color-status-critical`). These tokens are used exclusively within the shared `StatusBadge` component.
- Never rely on color alone. Every status badge always displays a clear text label and an indicator icon/dot.
- Progress bars use accent for Normal. For Warning, Critical and Exceeded use the same accent bar plus a distinct icon, a text badge, and a heavier border or pattern on the badge.
- Do not tint whole cards or table rows with status color.

---

## 8. Images

- Use grayscale editorial photographs in wide crops at the top of white cards, text beneath, only where a screen benefits (for example the landing page or help cards). Reserve dimensions (`width`, `height` or `aspect-ratio`) to prevent layout shift and keep the subject visible (`object-fit: cover` with a sensible `object-position`).
- Do not substitute generic stock photography for a useful explanation of the product. Prefer the product diagram.
- The product illustration keeps blue accents and soft depth.
- Portraits are optional. Use text attributions if no portrait is provided.
- Every image has meaningful `alt` text, or `alt=""` when purely decorative.

---

## 9. Motion

- Use only `--dp-motion-interaction` (160ms) with `--dp-motion-easing` (ease-out) for brief hover, focus and press responses.
- Keep the hero diagram and its connecting lines still.
- No page entrance sequence, no continuous decorative animation, no count-up number animations.
- Honor `prefers-reduced-motion: reduce`: remove transitions and the press movement.

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
  .btn:hover, .btn:active { transform: none; }
}
```

---

## 10. Responsive behavior

| Width | Behavior |
| --- | --- |
| around 1050px | Tighten gaps, keep column relationships |
| 760px and below | Stack the hero, prose pairs, department/editorial cards, process steps, quotations, plans and disclosure layout. Fact strips can stay two columns, as can short feature entries |
| 480px | Feature and benefit lists become single column; footer groups two columns |

- The diagram sits beneath the opening copy at small widths and stays within its container (no horizontal scroll).
- Wide tables scroll horizontally inside their own card (`overflow-x: auto`) with the first column kept readable; do not break the page width.
- Preserve every action at every width. Touch targets at least 44px.
- Navigation collapses to a menu button at 760px and below, and stays keyboard operable.

---

## 11. Accessibility checklist

- Text contrast meets WCAG AA: ink on ground and panel, on-field on field, on-accent on accent.
- Visible focus on every interactive element. Never remove outlines without replacing them.
- Logical tab order equals reading order. Dialogs trap focus and restore it on close.
- Forms: label every input, associate errors with `aria-describedby`, announce async results with an `aria-live` region.
- Status, selection and sort state are exposed with ARIA, not only visually.
- Role-restricted actions are hidden or disabled with an explanation, but the server remains the real authority.
- Test with keyboard only and at 200% zoom.

---

## 12. Implementation notes for this project

- Create `tokens.css`, a theme file (`theme.js` for MUI or `tailwind.config.js` mapping to the variables) and a small set of shared components under `frontend/src/components/` (`Button`, `Card`, `Field`, `DataTable`, `StatusBadge`, `StatCard`, `ProductDiagram`). Screens consume these; they do not restyle per page.
- Do not change routes, API calls, copy, validation, role checks or state logic while restyling.
- Money and percentage figures always come from the balances API; never calculate them in the UI.
- Skills and lists of departments come from the API; do not hard-code ET, Pharma, HM or MT in markup.
- After changes, run `npm run lint` and `npm test` in `frontend/`, then check each changed screen at 1280px, 1050px, 760px and 480px.

---

## 13. Design limits (do not do)

- Do not use blue for decoration. Blue marks meaningful emphasis: actions, selected states, key data.
- Do not turn every section into a card.
- Do not add unrelated accent colors or gradients outside the product diagram.
- Do not fill empty space with fabricated statistics, endorsements or fake screens.
- Do not add entrance animations or looping motion.
- Do not choose sections the content does not need. Select patterns from what each screen actually shows.

---

## 14. UI-1 refinements

### 14.1 Audit: Current Implementation vs. Target Visual Language

Audit conducted comparing existing screenshots (`docs/design-reference/current-*.png`) against target references (`docs/design-reference/target-*.png`):

| Area | Current State (`current-*.png`) | Target Visual Language (`target-*.png`) | UI-1 Refinement Required |
| :--- | :--- | :--- | :--- |
| **Typography** | Generic bold weights, loose default letter-spacing, plain monochrome titles. | Ultra-tight, heavy headlines (Host Grotesk, weight 800, tracking `-0.035em`/`-0.045em`) with **one vivid accent-coloured word**. Body in Instrument Sans. | Update typography tokens; add `.dp-title-accent` (`var(--dp-color-accent)`); ensure tabular figures on all numbers. |
| **Gradients & Glow** | Flat solid blue `#074ce0` tiles and buttons; no layered glow or depth. | Subtle dimensional gradients (`--dp-gradient-accent`, `--dp-gradient-dark`) and soft luminous glows (`--dp-shadow-glow`). | Introduce `--dp-gradient-accent`, `--dp-gradient-dark`, `--dp-gradient-active`, `--dp-gradient-tile`, `--dp-shadow-glow`. |
| **Elevation & Shadows** | Flat hairline borders or harsh single-layer drop shadows (`0 8px 24px rgba(...)`). | Soft, multi-layered shadows (`--dp-shadow-sm`, `md`, `lg`, `card-float`) providing elevation without dirtying light surfaces. | Introduce comprehensive shadow tokens; eliminate nested card borders. |
| **App Shell & Sidebar** | Plain text sidebar nav; solid blue active block; "Release 1 (MVP) • v1.5" in header; raw enum `Role: SUPER_ADMIN` in top bar; user card has bare sign-out. | Outline icons per item (`lucide-react`); gradient active pill with accent indicator; glowing rupee squircle tile; muted version `v1.6` in sidebar footer; human-friendly role labels ("Super Admin", "HoD — Engineering"); avatar initials. | Restyle App Shell, integrate Lucide icons, friendly role helper, and avatar initials. |
| **Page Header** | Inconsistent header spacing; missing unified page intro pattern. | Standardized pattern across all screens: strong title with accent word, one-line supporting description, primary action button on the right. | Standardize page headers across all feature pages. |
| **Login Illustration** | Outdated `ProductDiagram` with truncated text ("Engineering Blo...", "Hotel Manage..."). | Floating slightly tilted cards joined by dashed connector lines over faint concentric circular orbit lines around a glowing central gradient rupee tile. Cards show real concepts: department budget card with utilisation bar, approval tick card, mini bar chart card. Dev quick-fills as small pills. | Replace `ProductDiagram` on Login page with the floating tilted card system; restyle dev quick-fill buttons to compact pill chips. |
| **Overview Page** | Cluttered header with empty/broken diagram card; stat strip is bare text; nested card wrappers. | Clean tightened header; 5 distinct stat cards with outline icons, clear labels, and large tabular numbers; Available highlighted in accent; Department summary cards with thresholded utilisation progress bars and explicit percentage text; skeleton loaders. | Remove empty diagram from overview; convert stat strip to 5 stat cards; polish department cards and utilisation bar. |
| **Data Tables** | Nested borders (card-in-a-card); basic borders; harsh rectangular action buttons; numeric columns sometimes unaligned; potential mobile clipping. | Single card container (no nested borders); sticky header; subtle row hover; right-aligned tabular figures; status chips with dot + label; ghost icon+text row actions; friendly empty state; responsive horizontal scroll wrapper. | Restyle `DataTable` component to enforce single-card rhythm, sticky headers, ghost actions, and responsive scrolling. |
| **Formatting & Glyphs** | Stray glyph `"↳"` before sub-unit descriptions; inconsistent dates (`25/10/2026`). | Clean metadata hierarchy without stray glyphs; standard `"1 Apr 2026"` date formatting via shared `formatDate` helper; Indian rupee grouping (`₹ 20,00,000`). | Remove `"↳"`; implement `formatDate` utility and enforce across all tables and modals. |
| **Modals & Forms** | Generic dialog styles; lack unified header/body/footer structure. | Layered shadows (`--dp-shadow-lg`), rounded corners (`--dp-radius-lg`), clean footer action buttons, inline error messages with icons, loading and disabled button states. | Refactor modals (Ceiling, Review, Reject, Detail, Expense) and form fields to match design tokens. |

### 14.2 UI-1 Token Specifications

All tokens must be added to `frontend/src/styles/tokens.css` and used across components. No hardcoded hex or rgba values are permitted in components.

```css
:root {
  /* UI-1 Gradients */
  --dp-gradient-accent:       linear-gradient(135deg, #1d68f2 0%, #074ce0 100%);
  --dp-gradient-accent-hover: linear-gradient(135deg, #2575fc 0%, #0a56f5 100%);
  --dp-gradient-dark:         linear-gradient(180deg, #16191f 0%, #0d0f13 100%);
  --dp-gradient-active:       linear-gradient(90deg, rgba(7, 76, 224, 0.10) 0%, rgba(7, 76, 224, 0.02) 100%);
  --dp-gradient-tile:         linear-gradient(135deg, #2563eb 0%, #074ce0 100%);

  /* UI-1 Shadow Scale */
  --dp-shadow-sm:             0 1px 2px 0 rgba(22, 25, 31, 0.05);
  --dp-shadow-md:             0 4px 6px -1px rgba(22, 25, 31, 0.07), 0 2px 4px -2px rgba(22, 25, 31, 0.05);
  --dp-shadow-lg:             0 10px 15px -3px rgba(22, 25, 31, 0.08), 0 4px 6px -4px rgba(22, 25, 31, 0.04);
  --dp-shadow-glow:           0 0 24px -2px rgba(7, 76, 224, 0.35);
  --dp-shadow-card-float:     0 12px 28px -4px rgba(22, 25, 31, 0.12), 0 4px 8px -2px rgba(22, 25, 31, 0.06);

  /* UI-1 Radius Scale */
  --dp-radius-xs:             4px;
  --dp-radius-sm:             6px;
  --dp-radius-md:             8px;
  --dp-radius-lg:             12px;
  --dp-radius-xl:             16px;
  --dp-radius-pill:           9999px;

  /* UI-1 Typography & Letter-spacing Tokens */
  --dp-tracking-tight:        -0.02em;
  --dp-tracking-tighter:      -0.035em;
  --dp-tracking-tightest:     -0.045em;

  /* UI-1 Page Gutters & Spacing */
  --dp-spacing-gutter-mobile:  16px;
  --dp-spacing-gutter-tablet:  24px;
  --dp-spacing-gutter-desktop: 32px;
  --dp-spacing-content-max:    1280px;
  /* UI-1 Semantic UI State Tokens */
  --dp-color-danger:          var(--dp-color-status-critical);
  --dp-color-danger-subtle:   var(--dp-color-status-critical-bg);
  --dp-color-danger-border:   var(--dp-color-status-critical-border);
  --dp-color-success:         var(--dp-color-status-approved);
  --dp-color-success-subtle:  var(--dp-color-status-approved-bg);
  --dp-color-success-border:  var(--dp-color-status-approved-border);
  --dp-color-warning:         var(--dp-color-status-warning);
  --dp-color-warning-subtle:  var(--dp-color-status-warning-bg);
  --dp-color-warning-border:  var(--dp-color-status-warning-border);
  --dp-color-info:            var(--dp-color-status-submitted);
  --dp-color-info-subtle:     var(--dp-color-status-submitted-bg);
  --dp-color-info-border:     var(--dp-color-status-submitted-border);
}
```

