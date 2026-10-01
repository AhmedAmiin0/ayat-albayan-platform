# المِداد والذهب — Ink & Gold: the Ayat Al-Bayan design system

Implementation spec for `apps/web` (Tailwind v4 + shadcn/ui + TanStack Table), `apps/mobile` (Expo / React Native) and the lesson-report PDF worker.
Live reference: `docs/design/ink-and-gold.html` (10 sections, light/dark/auto toggle). The token values in this file were read back from the rendered page, so they match it.

---

## 1. Concept

Every screen is a page of an illuminated Mushaf.

- **The margin (هامش)** is the app background. It holds the navigation, the running head (dates and clocks) and the per-row marginal notes.
- **The page (رَقّ)** is a lighter sheet inside a *jadwal*: a ruled frame with an ink rule and a gold rule. The work lives on it: tables, forms, dialogs.
- **The surah-header cartouche** appears once per screen and holds that screen's title.
- **The binding** (leather, gold fillets, corner pieces, a central shamsa) appears once in the whole product: on the login screen.

Amiri, the revival of Cairo's Bulaq/Amiriya press Naskh, sets titles. IBM Plex Sans Arabic sets everything else.

### Principles (the rules reviewers enforce)

1. **Gold is ornament, lapis is action.** Gold (`--gold*`) never fills a button, a link or text. Anything clickable is lapis, or neutral with a lapis focus ring. If you are reaching for gold to make something "important", use hierarchy instead.
2. **Saffron means «دورك» and nothing else.** Saffron marks only things an admin must act on now: «يحتاج تأكيد», new lead «جديد», «محتاج معلم/ة», «الباقة خلصت», «مش مدفوع», «تقرير ما اتبعتش», «فاضل حلقتين». It is never a button, a focus ring or a decoration. If nobody has to do anything, it is not saffron.
3. **Shape carries state; colour only confirms it.** Every status shows a nuqta glyph (fill, half, hollow or struck) **and** the ar.json word. Colour is the third channel, so no state is ever communicated by colour alone.
4. **One rosette, one cartouche, one filled button.** The verse-end rosette ۝ only ever holds a number (section, page, PDF page) or the alef in the logo. It is never a status and is never struck through. Each screen has exactly one cartouche (its title) and at most one filled primary button. The one exception is a list whose rows *are* the task: on the mobile «النهارده» screen every card that needs confirmation carries its own filled «تأكيد», because confirming is the only job on that screen.
5. **Arabic first, one numeral system.**
   - Titles are Amiri 700 at 20px or larger, with line-height 1.5.
   - UI text is Plex with line-height 1.6.
   - No letter-spacing and no case transforms on Arabic.
   - Western digits everywhere, tabular in data: codes, phones, times, money, counts, and the Hijri date as well.
   - Nothing below 12px anywhere, the PDF included (its smallest label is 0.86em = 12px at 794px).
   - LTR values are always isolated (`dir="ltr"` / `<bdi>`).
6. **Ornament sits outside the work.** Frames, cartouches and marginal notes sit around the data and never inside table cells, inputs or dense rows. Mobile drops the frame and cartouche entirely and keeps the nuqta, lapis and saffron.
7. **Every time is shown with its zone.** The running head shows Gregorian date, Hijri date, Riyadh and Cairo clocks. Any time that belongs to someone else's zone says so in the same line, e.g. «18:00 بتوقيت مسقط». DB stays UTC (CLAUDE.md rule 6).

---

## 2. Typography

### Families

| Role | Family | Weights | Where |
|---|---|---|---|
| Display | **Amiri** | 700 only | Page cartouche titles, section titles, dialog titles, empty-state titles, PDF headings, wordmark, KPI numerals |
| UI and data | **IBM Plex Sans Arabic** | 400, 500, 600, 700 | Everything else. It is already `--font-sans` in `apps/web/src/index.css` |

Google Fonts URL (two families, Amiri 400 dropped because nothing uses it):

```
https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap
```

Fallback stacks:

```css
--font-display: 'Amiri', 'Noto Naskh Arabic', serif;
--font-sans:    'IBM Plex Sans Arabic', 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
```

Production: self-host the woff2 files (`@fontsource/amiri`, `@fontsource/ibm-plex-sans-arabic`), so the PDF worker and offline Expo builds use the same files.

### Type scale (Arabic line-heights)

| Token | px | line-height | Family / weight | Use |
|---|---|---|---|---|
| `text-hero` | 68 | 1.45 | Amiri 700 | Brand moments only (login, lockup) |
| `text-display` | 46 | 1.5 | Amiri 700 | Board/marketing headline |
| `text-h1` | 34 | 1.5 | Amiri 700 | Mobile «النهارده» header (32 in RN) |
| `text-h2` | 28 | 1.5 | Amiri 700 | Section titles |
| cartouche | 25 (21 on phones) | 1 inside a 52px band | Amiri 700 | The one page title per screen |
| `text-h3` | 23 | 1.5 | Amiri 700 | Panel titles (المواعيد المتاحة) |
| `text-h4` | 20 | 1.5 | Amiri 700 | Smallest Amiri allowed |
| `text-lg` | 18 | 1.6 | Plex 600 | Profile sub-heads |
| `text-base` | 16 | 1.6 | Plex 400 | **Every input on mobile** (iOS zoom floor), long reading text |
| `text-body` | 15 | 1.6 | Plex 400 | Paragraphs, dialog body |
| `text-sm` | 14 | 1.6 | Plex 400/600 | Table cells, buttons, desktop inputs |
| `text-xs` | 13 | 1.5 | Plex 500/600 | Labels, chips, meta |
| `text-2xs` | 12 | 1.5 | Plex 500 | Phone under a name, axis labels, counts. Floor: nothing smaller |

Rules:

- Amiri is never below 20px and never carries data, except KPI numerals, which are display numbers.
- Text weight is 400 or more below 18px.
- Use `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`) on every number that is compared or changes.
- Headings use `text-wrap: balance`; descriptions use `text-wrap: pretty`.
- Measure: paragraphs are capped at about 70ch.

### Numerals (one system)

- **Western digits everywhere**, including KPI numerals (Amiri has Western digits) and the Hijri date. Format with `Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })`, which gives `20 ربيع الآخر 1448 هـ`.
- On Expo/Hermes, `islamic-umalqura` support depends on the platform ICU. Compute the Hijri string on the API (Node has full ICU) and send it as a field.
- **Required `ar.json` change (digits only, owner sign-off):** six keys still carry Eastern digits, and every place they appear sits next to Western times or prices (the rates table, the lesson card, the PDF meta line and footer). Change only the digits; the wording stays exactly as today (CLAUDE.md rule 10 is about wording):

  | Key | Today | Change to |
  |---|---|---|
  | `enums.duration.30` | ٣٠ دقيقة | 30 دقيقة |
  | `enums.duration.45` | ٤٥ دقيقة | 45 دقيقة |
  | `enums.packageSize.4` | ٤ حلقات في الشهر | 4 حلقات في الشهر |
  | `enums.packageSize.8` | ٨ حلقات في الشهر | 8 حلقات في الشهر |
  | `enums.packageSize.12` | ١٢ حلقة في الشهر | 12 حلقة في الشهر |
  | `enums.packageSize.16` | ١٦ حلقة في الشهر | 16 حلقة في الشهر |

  The mocks already show the changed form. Add a unit test that fails if any `ar.json` value contains U+0660–U+0669.

---

## 3. Tailwind v4 tokens: paste into `apps/web/src/index.css`

Raw tokens switch per theme. Tailwind maps them with `@theme inline`, which resolves at use-time, so theme switching needs no rebuild. The existing shadcn slot names (`background`, `card`, `primary`, `input`, `ring`, `destructive`, ...) are kept, so `button.tsx` and `input.tsx` keep compiling.

```css
@import 'tailwindcss';

/* `dark:` follows the attribute. Set data-theme on <html> at boot ("auto" resolved via matchMedia),
   so tokens and dark: utilities always agree. The media query below is the no-JS fallback. */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

/* ---------- raw tokens: light (also any element with data-theme="light", e.g. the PDF preview) ---------- */
:root, [data-theme='light'] {
  color-scheme: light;
  --margin: oklch(0.938 0.024 86);
  --page: oklch(0.978 0.012 90);
  --raised: oklch(0.992 0.006 90);
  --sunk: oklch(0.955 0.018 88);
  --ink: oklch(0.24 0.035 262);
  --ink-2: oklch(0.42 0.03 262);
  --ink-3: oklch(0.50 0.025 262);
  --rule: oklch(0.87 0.022 85);
  --rule-strong: oklch(0.78 0.03 82);
  --rule-input: oklch(0.62 0.03 80);
  --gold: oklch(0.70 0.115 78);
  --gold-soft: oklch(0.82 0.07 82);
  --gold-wash: oklch(0.93 0.045 85);
  --lapis: oklch(0.43 0.135 263);
  --lapis-hover: oklch(0.37 0.13 263);
  --lapis-wash: oklch(0.93 0.03 263);
  --on-lapis: oklch(0.98 0.01 90);
  --verdigris: oklch(0.46 0.09 165);
  --verdigris-wash: oklch(0.93 0.035 165);
  --saffron: oklch(0.50 0.11 55);
  --saffron-wash: oklch(0.94 0.045 75);
  --cinnabar: oklch(0.50 0.16 27);
  --cinnabar-solid: oklch(0.52 0.17 27);
  --cinnabar-wash: oklch(0.94 0.03 27);
  --on-cinnabar: oklch(0.98 0.01 90);
  --neutral-wash: oklch(0.925 0.012 262);
  --inverse: oklch(0.26 0.04 262);
  --on-inverse: oklch(0.96 0.014 88);
  --inverse-gold: oklch(0.80 0.10 82);
  --cover: oklch(0.25 0.05 262);
  --leather: oklch(0.32 0.06 42);
  --leather-deep: oklch(0.255 0.05 40);
  --leather-lift: oklch(0.40 0.06 45);
  --gold-on-cover: oklch(0.80 0.105 82);
  --cover-ink: oklch(0.93 0.02 88);
  --scrim: oklch(0.22 0.03 262 / 0.45);
  --elev-page: 0 1px 0 oklch(0.24 0.035 262 / 0.04), 0 18px 40px -18px oklch(0.24 0.035 262 / 0.28);
  --elev-pop: 0 30px 60px -20px oklch(0.15 0.03 262 / 0.55);
  --elev-toast: 0 12px 28px -12px oklch(0.15 0.03 262 / 0.5);
}

/* ---------- raw tokens: dark ("night Mushaf") ---------- */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
    --margin: oklch(0.165 0.022 262); --page: oklch(0.205 0.026 262); --raised: oklch(0.235 0.028 262); --sunk: oklch(0.185 0.024 262);
    --ink: oklch(0.93 0.018 88); --ink-2: oklch(0.80 0.02 88); --ink-3: oklch(0.70 0.02 88);
    --rule: oklch(0.30 0.028 262); --rule-strong: oklch(0.38 0.035 262); --rule-input: oklch(0.54 0.03 262);
    --gold: oklch(0.74 0.105 82); --gold-soft: oklch(0.48 0.07 80); --gold-wash: oklch(0.26 0.04 78);
    --lapis: oklch(0.74 0.11 258); --lapis-hover: oklch(0.80 0.10 258); --lapis-wash: oklch(0.28 0.05 262); --on-lapis: oklch(0.17 0.03 262);
    --verdigris: oklch(0.78 0.09 165); --verdigris-wash: oklch(0.27 0.04 165);
    --saffron: oklch(0.80 0.11 58); --saffron-wash: oklch(0.28 0.045 58);
    --cinnabar: oklch(0.75 0.13 27); --cinnabar-solid: oklch(0.62 0.16 27); --cinnabar-wash: oklch(0.27 0.05 27); --on-cinnabar: oklch(0.17 0.03 262);
    --neutral-wash: oklch(0.27 0.02 262);
    --inverse: oklch(0.90 0.02 88); --on-inverse: oklch(0.22 0.03 262); --inverse-gold: oklch(0.55 0.11 72);
    --cover: oklch(0.27 0.05 262);
    --leather: oklch(0.28 0.05 42); --leather-deep: oklch(0.215 0.04 40); --leather-lift: oklch(0.35 0.055 45);
    --scrim: oklch(0.08 0.02 262 / 0.62);
    --elev-page: 0 0 0 1px oklch(0 0 0 / 0.25), 0 18px 40px -16px oklch(0 0 0 / 0.65);
    --elev-pop: 0 30px 60px -20px oklch(0 0 0 / 0.7);
    --elev-toast: 0 12px 28px -12px oklch(0 0 0 / 0.6);
  }
}
[data-theme='dark'] {
  color-scheme: dark;
  /* identical values to the media block above; keep the two in sync (a lint test can diff them) */
  --margin: oklch(0.165 0.022 262); --page: oklch(0.205 0.026 262); --raised: oklch(0.235 0.028 262); --sunk: oklch(0.185 0.024 262);
  --ink: oklch(0.93 0.018 88); --ink-2: oklch(0.80 0.02 88); --ink-3: oklch(0.70 0.02 88);
  --rule: oklch(0.30 0.028 262); --rule-strong: oklch(0.38 0.035 262); --rule-input: oklch(0.54 0.03 262);
  --gold: oklch(0.74 0.105 82); --gold-soft: oklch(0.48 0.07 80); --gold-wash: oklch(0.26 0.04 78);
  --lapis: oklch(0.74 0.11 258); --lapis-hover: oklch(0.80 0.10 258); --lapis-wash: oklch(0.28 0.05 262); --on-lapis: oklch(0.17 0.03 262);
  --verdigris: oklch(0.78 0.09 165); --verdigris-wash: oklch(0.27 0.04 165);
  --saffron: oklch(0.80 0.11 58); --saffron-wash: oklch(0.28 0.045 58);
  --cinnabar: oklch(0.75 0.13 27); --cinnabar-solid: oklch(0.62 0.16 27); --cinnabar-wash: oklch(0.27 0.05 27); --on-cinnabar: oklch(0.17 0.03 262);
  --neutral-wash: oklch(0.27 0.02 262);
  --inverse: oklch(0.90 0.02 88); --on-inverse: oklch(0.22 0.03 262); --inverse-gold: oklch(0.55 0.11 72);
  --cover: oklch(0.27 0.05 262);
  --leather: oklch(0.28 0.05 42); --leather-deep: oklch(0.215 0.04 40); --leather-lift: oklch(0.35 0.055 45);
  --scrim: oklch(0.08 0.02 262 / 0.62);
  --elev-page: 0 0 0 1px oklch(0 0 0 / 0.25), 0 18px 40px -16px oklch(0 0 0 / 0.65);
  --elev-pop: 0 30px 60px -20px oklch(0 0 0 / 0.7);
  --elev-toast: 0 12px 28px -12px oklch(0 0 0 / 0.6);
}

/* ---------- theme-independent tokens ---------- */
@theme {
  --font-sans: 'IBM Plex Sans Arabic', 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
  --font-display: 'Amiri', 'Noto Naskh Arabic', serif;

  --text-2xs: 12px;     --text-2xs--line-height: 1.5;
  --text-xs: 13px;      --text-xs--line-height: 1.5;
  --text-sm: 14px;      --text-sm--line-height: 1.6;
  --text-body: 15px;    --text-body--line-height: 1.6;
  --text-base: 16px;    --text-base--line-height: 1.6;
  --text-lg: 18px;      --text-lg--line-height: 1.6;
  --text-h4: 20px;      --text-h4--line-height: 1.5;
  --text-h3: 23px;      --text-h3--line-height: 1.5;
  --text-h2: 28px;      --text-h2--line-height: 1.5;
  --text-h1: 34px;      --text-h1--line-height: 1.5;
  --text-display: 46px; --text-display--line-height: 1.5;
  --text-hero: 68px;    --text-hero--line-height: 1.45;

  --radius-xs: 2px;   /* the jadwal page, dialogs */
  --radius-sm: 6px;   /* small tabs, fihris items */
  --radius-md: 8px;   /* buttons, inputs, menus */
  --radius-lg: 12px;  /* screens, mobile cards, toasts */
  /* chips and badges: rounded-full */

  --ease-ink: cubic-bezier(.2, .7, .2, 1);
}

/* ---------- semantic colours for utilities (resolved at use-time) ---------- */
@theme inline {
  /* shadcn slots */
  --color-background: var(--margin);
  --color-foreground: var(--ink);
  --color-card: var(--page);
  --color-card-foreground: var(--ink);
  --color-popover: var(--raised);
  --color-popover-foreground: var(--ink);
  --color-primary: var(--lapis);
  --color-primary-hover: var(--lapis-hover);
  --color-primary-foreground: var(--on-lapis);
  --color-secondary: var(--raised);
  --color-secondary-foreground: var(--ink);
  --color-muted: var(--sunk);
  --color-muted-foreground: var(--ink-3);
  --color-accent: var(--lapis-wash);
  --color-accent-foreground: var(--lapis);
  /* destructive is text-safe in both themes: apps/web uses text-destructive for 13 error labels today.
     The filled delete button uses destructive-solid. */
  --color-destructive: var(--cinnabar);
  --color-destructive-solid: var(--cinnabar-solid);
  --color-destructive-foreground: var(--on-cinnabar);
  --color-border: var(--rule);
  --color-input: var(--rule-input);
  --color-ring: var(--lapis);
  /* sidebar slots = the margin */
  --color-sidebar: var(--margin);
  --color-sidebar-foreground: var(--ink-2);
  --color-sidebar-primary: var(--lapis);
  --color-sidebar-primary-foreground: var(--on-lapis);
  --color-sidebar-accent: var(--page);
  --color-sidebar-accent-foreground: var(--ink);
  --color-sidebar-border: var(--rule);
  --color-sidebar-ring: var(--lapis);
  /* surfaces + ink */
  --color-margin: var(--margin);
  --color-page: var(--page);
  --color-raised: var(--raised);
  --color-sunk: var(--sunk);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-rule: var(--rule);
  --color-rule-strong: var(--rule-strong);
  /* ornament (never on interactive elements, never as text) */
  --color-gold: var(--gold);
  --color-gold-soft: var(--gold-soft);
  --color-gold-wash: var(--gold-wash);
  /* status families: text/border + soft background */
  --color-ok: var(--verdigris);
  --color-ok-soft: var(--verdigris-wash);
  --color-act: var(--saffron);
  --color-act-soft: var(--saffron-wash);
  --color-danger: var(--cinnabar);
  --color-danger-soft: var(--cinnabar-wash);
  --color-neutral-soft: var(--neutral-wash);
  /* inverse (toasts) + brand surfaces */
  --color-inverse: var(--inverse);
  --color-on-inverse: var(--on-inverse);
  --color-inverse-gold: var(--inverse-gold);
  --color-cover: var(--cover);
  --color-leather: var(--leather);
  --color-leather-deep: var(--leather-deep);
  --color-leather-lift: var(--leather-lift);
  --color-gold-on-cover: var(--gold-on-cover);
  --color-cover-ink: var(--cover-ink);
  --color-scrim: var(--scrim);
  /* elevation */
  --shadow-page: var(--elev-page);
  --shadow-pop: var(--elev-pop);
  --shadow-toast: var(--elev-toast);
}

@layer base {
  body { @apply bg-background text-foreground font-sans text-sm antialiased; }
  :focus-visible { outline: 2px solid var(--lapis); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
}
```

Measured contrast (WCAG 2.x, sRGB, both themes, from `shots.mjs`). Every text pair passes AA:

| Pair | Light | Dark |
|---|---|---|
| ink / margin | 13.79 | 15.68 |
| ink-2 / page | 8.01 | 9.59 |
| ink-3 / sunk (lowest secondary-text pair) | 5.26 | 6.97 |
| ink-3 / margin | 5.00 | 7.22 |
| lapis / page (links) | 7.76 | 7.74 |
| on-lapis / lapis (primary button) | 7.77 | 8.27 |
| on-cinnabar / cinnabar-solid (destructive-solid button) | 5.68 | 4.87 |
| saffron / saffron-wash (act chip) | 5.20 | 7.71 |
| verdigris / verdigris-wash (ok chip) | 5.57 | 7.68 |
| cinnabar / cinnabar-wash (bad chip) | 5.40 | 6.55 |
| ink-2 / neutral-wash (neutral chip) | 6.80 | 8.03 |
| on-inverse / inverse (toast and its action) | 13.83 | 12.84 |
| gold-on-cover / leather | 6.85 | 7.86 |
| **rule-input / raised** (input and secondary-button boundary, non-text needs 3:1) | 3.54 | 3.30 |
| cinnabar / page (`text-destructive`, `text-danger`) | 6.12 | 7.65 |
| rule-strong / raised (frames and hairlines only: never the only edge of a control) | 1.96 | 1.67 |
| gold / page (ornament only, exempt) | 2.55 | 7.71 |

`--cinnabar-solid` is a fill, never text: in dark it measures 4.56:1 on `--page`, 4.25 on `--raised` (inputs, dialogs) and 3.91 on `--cinnabar-wash` (alerts), so the 13 existing `text-destructive` error labels would fail AA wherever they sit on a raised surface. That is why `destructive` maps to `--cinnabar` (7.65 / 7.12 / 6.55).

Put `shots.mjs`'s pair check into CI against the shared theme object (section 12).

---

## 4. Space, radius, elevation, motion

- **Spacing:** Tailwind's 4px grid.
  - 8 inside a group, 16 or more between groups, 24 between page sections, 48 or more between screens on the board.
  - Table cell padding is `px-2 py-2.5` (8/10).
  - Page padding is 24, or 16 on phones.
- **Control heights:** 32 (`h-8`) for dense admin rows and table toolbars, 40 (`h-10`) as the default, 48 (`h-12`) for teacher/guardian surfaces and the report submit.
  - Mobile touch targets are at least 44.
  - Every input on screens under 640px is 16px text and at least 44 tall.
- **Radius:** rectangles carry the frame.
  - `rounded-xs` (2) for the jadwal page and dialogs.
  - `rounded-md` (8) for controls.
  - `rounded-lg` (12) for screens, mobile cards and toasts.
  - `rounded-full` only for chips, badges, avatars and the theme seg.
  - Never round the jadwal.
- **Elevation:** three levels only.
  - `shadow-page`: the screen on the margin.
  - `shadow-pop`: dialogs and menus.
  - `shadow-toast`.
  - Nothing else gets a shadow. Cards inside a page are separated by rules and space, not shadows.
- **Motion:**
  - 120ms `ease-ink` for hover/press colour.
  - 200ms for dialog, toast, popover enter/exit (opacity plus 4px translate on the block axis).
  - The optimistic confirm on mobile shows its result immediately with «تراجع»; no spinner.
  - No entrance animations on page load.
  - `prefers-reduced-motion` gets 0ms everywhere.

---

## 5. Motifs: where they are allowed and where they are forbidden

| Device | Allowed | Forbidden |
|---|---|---|
| **Jadwal frame**: `border: 1px var(--rule-strong)` + `outline: 1.5px var(--gold)` at a 4px offset, `rounded-xs` | Around the one work page per admin screen; around dialogs; around the PDF page | Cards inside a page, table cells, mobile, nested frames |
| **3px double gold rule** (`border-block-end: 3px double var(--gold)`) | Under table heads, under the inbox list head, under the selected tab, on top of the week grid, KPI strip | Between rows (use `--rule`), under body text |
| **Cartouche** (`motif-cartouche-cap.svg` twice, first mirrored) | Exactly one per screen: page title, or the entity name on a profile (أ. فاطمة الزهراء); PDF title | Section headings, buttons, mobile, two on one screen |
| **Verse-end rosette** (`motif-rosette-number.svg`) | Logo; current page in pagination; section numbers; PDF page number. It only holds a number | Status glyphs, bullets, empty states, anything struck through, decoration |
| **Nuqta glyphs** (`motif-nuqta-glyphs.svg`) | All statuses, grade pips, timeline nodes, marginal-note bullets, list bullets | Large decorative use (more than 16px) except the empty state |
| **Hamish (marginal note)** | One alert per row in the حاشية column after a double rule (`border-inline-start: 3px double var(--gold-soft)`); automated follow-up notes in the inbox; time-off impact | Long text (keep to 3 words or so), more than one per row |
| **Binding cover** (`motif-binding.svg`) | Login screen only | Anywhere else, including empty states and splash screens |
| **Gold** | Frames, rules, rosette, cartouche, ornament glyphs | Text, buttons, links, focus rings, charts |

Never: Quran verses as decoration, mosques, domes, crescents, mihrab arches, star-lattice wallpaper.

---

## 6. Components

### Button (`components/ui/button.tsx`)

| Variant | Classes | Use |
|---|---|---|
| `default` (primary) | `bg-primary text-primary-foreground hover:bg-primary-hover` | One per view: إضافة طالب, حفظ المواعيد, دمج, تأكيد, دخول |
| `secondary` | `bg-secondary text-secondary-foreground border border-input hover:bg-sunk` | Peers: تصدير, تعديل, لأ، ده طالب جديد (أخ أو أخت), row next-actions. The border is the button's only edge, so it uses the 3:1 `--rule-input`, not `--rule-strong` |
| `ghost` | `text-primary hover:bg-accent` | إلغاء, سيبها هنا, إضافة ميعاد inline |
| `destructive` | `bg-destructive-solid text-destructive-foreground` | حذف, inside a confirm only |
| `destructive-quiet` | `text-destructive border border-destructive/45` | إلغاء الحلقة in lists |

- Sizes: `sm` `h-8 px-3 text-xs`, `default` `h-10 px-4 text-sm`, `lg` `h-12 px-5 text-body`.
- All variants use `rounded-md font-semibold gap-2`.
- Disabled is `opacity-45 cursor-not-allowed`, and the label says why when it can («جاري الحفظ…»).
- Focus is the global lapis 2px outline at a 2px offset.
- Icons are 17px. Directional icons (chevrons, reply, back) mirror in RTL: «السابق» uses a chevron pointing right, «التالي» a chevron pointing left. Lucide's `reply` is drawn for LTR, so it gets `rtl:-scale-x-100`. Logout is drawn RTL-native: the door at the inline-start (right), the arrow leaving toward the inline-end.

### Input / Select

- Classes: `h-10 rounded-md border border-input bg-popover px-3 text-base sm:text-sm placeholder:text-ink-3`.
- Focus: `outline-2 outline-ring border-ring`. Invalid: `aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger`.
- Disabled is `bg-sunk text-ink-3`. Generated fields such as the student code are disabled, with the hint «بيتعمل لوحده، مش بيتكتب».
- Select: native `<select>` or Radix Select, with a chevron at the inline-end. **Times are always selects**, never typed (rule 6).
- **Phone input:**
  - An LTR group `[+966 ▾][55 214 7730]` with `dir="ltr"`.
  - A live E.164 preview «هيتحفظ كده: <bdi dir=ltr>+966552147730</bdi>» in `text-ok` with a check icon.
  - Errors from `common.phoneErrors.*`. `missing_country_code` contains «+966 أو +20», so render it through a rich-text slot that wraps each code in `<bdi dir="ltr">`; otherwise it shows «966+».
- LTR values (email, codes, URLs) get `dir="ltr"` and `text-align: end` inside RTL forms, so they line up with their labels.

### Card / Page

- There is no generic "card".
- The **work page** is `bg-card border border-rule-strong outline-[1.5px] outline-gold outline-offset-4 rounded-xs p-6`, with `container-type: inline-size` for container queries.
- Inside it, group with space and `--rule` hairlines, not boxes.
- Secondary panels (time-off, rates) are plain sections with an Amiri `text-h4` title.
- The only boxed card is the **mobile lesson card**: `bg-card border border-rule-strong rounded-lg p-3`, with a 4px saffron `border-inline-start` when it needs action.

### Dialog

- Classes: `bg-card border border-rule-strong outline-[1.5px] outline-gold outline-offset-4 rounded-xs shadow-pop`, width up to 740px, on `bg-scrim`.
- Header grid: glyph tile (40px circle, tone-soft background, 18px nuqta) | Amiri 27px title | close icon button, with the description underneath.
- Footer: a hint at the start, buttons at the end in the order ghost, secondary, primary.
- On phones it flows in the document, the buttons stack full-width with the primary on top, and comparison tables become two value columns with the field label as a row header.
- **Duplicate student (R-STU-03):**
  - Calm: saffron hollow glyph, no red.
  - `students.duplicateTitle` and `duplicateWarning`.
  - A four-column compare: field | «اللي بتسجله دلوقتي» | «متسجل من قبل AB-0183» | النتيجة (≈ near, ✓ same).
  - Then the siblings line from `students.siblings`.
  - Actions `common.cancel` / `students.createAnyway` / `students.merge`.

### Data table (TanStack)

- Head: `text-xs font-semibold text-ink-3` over a 3px double gold rule, with `scope="col"` and `aria-sort` on sortable columns.
- Rows: `py-2.5 px-2 border-b border-rule`, hover `bg-sunk/75`, `vertical-align: middle`, `white-space: nowrap`. Two-line cells (name with «9 سنين، الرياض», guardian with phone) use a 12px `text-ink-3` second line.
- Codes and phones: `dir="ltr" tabular-nums`, never wrapping.
- Row actions are always visible: WhatsApp and a ⋮ menu, both icon buttons with `aria-label`s that name the row.
- **Hamish column** (last, after a 3px double `gold-soft` inline-start border):
  - One marginal note per row, with a 9px nuqta bullet.
  - Action notes (`note--act`) are saffron bullet + ink 600 text: «باقي حلقتين», «الباقة خلصت», «محتاج معلم/ة», «تقرير ما اتبعتش».
  - Information notes are gold bullet + ink-2: «تجريبية النهارده 16:00».
  - **Collapse rule:** `@container (max-width: 940px)` hides the column and shows the same note under the name (`.fold`). Under 640px the table becomes stacked rows: name + status chip, code / program / teacher, guardian + phone, note.
- **Pagination:** «عرض 8 من 64 طالب», page numbers with the current page inside the rosette, السابق / التالي secondary `sm` buttons.

### Status chip: `<StatusChip tone shape label />`

- Size: 26px tall (22px `sm`), `rounded-full`, `px-2.5`, 13px/600.
- Colours: `bg-{tone}-soft text-{tone} border border-{tone}/25`, with a 12px nuqta glyph in front.
- Tones: `ok` (verdigris), `act` (saffron), `bad` (cinnabar), `neutral` (`bg-neutral-soft text-ink-2`). The `bad` tone uses the `danger` utilities (`bg-danger-soft text-danger border-danger/25`); there is no `text-bad`. Keep the class strings as literals in a `toneClass` map so Tailwind's scanner sees them.

Shape meanings: **fill** = settled or done, **half** = underway, **hollow** = waiting, **struck** = stopped or cancelled.

Keep this map in `packages/shared/src/status-style.ts` and unit-test that every enum value has an entry:

| Enum | Value | Label key (`ar.json`) | Label | Tone | Glyph |
|---|---|---|---|---|---|
| **lesson_status** | scheduled | `enums.lessonStatus.scheduled` | يحتاج تأكيد | act | hollow |
| | confirmed | `enums.lessonStatus.confirmed` | مؤكدة | ok | fill |
| | completed | `enums.lessonStatus.completed` | تمت | neutral | fill |
| | late | `enums.lessonStatus.late` | متأخرة | bad | half |
| | excused | `enums.lessonStatus.excused` | اعتذر مسبقًا | neutral | struck |
| | no_show | `enums.lessonStatus.no_show` | غياب بدون إشعار | bad | struck |
| | cancelled_by_teacher | `enums.lessonStatus.cancelled_by_teacher` | اتلغت من المعلم/ة | bad | struck |
| | cancelled_by_admin | `enums.lessonStatus.cancelled_by_admin` | اتلغت من الإدارة | neutral | struck |
| | rescheduled | `enums.lessonStatus.rescheduled` | اتغير ميعادها | neutral | half |
| **lead_status** | new | `enums.leadStatus.new` | جديد | act | hollow |
| | contacted | `enums.leadStatus.contacted` | اتواصلنا | neutral | half |
| | interested_no_slot | `enums.leadStatus.interested_no_slot` | مهتم بدون ميعاد | neutral | hollow |
| | trial_booked | `enums.leadStatus.trial_booked` | حجز حلقة تجريبية | ok | hollow |
| | trial_done | `enums.leadStatus.trial_done` | حضر الحلقة التجريبية | ok | half |
| | converted | `enums.leadStatus.converted` | مشترك | ok | fill |
| | no_reply | `enums.leadStatus.no_reply` | مردّش | neutral | hollow |
| | lost | `enums.leadStatus.lost` | عميل ضايع / اعتذر | neutral | struck |
| **student_status** | trial | `enums.studentStatus.trial` | تجريبي | neutral | hollow |
| | active | `enums.studentStatus.active` | مشترك | ok | fill |
| | paused | `enums.studentStatus.paused` | متوقف مؤقتًا | neutral | half |
| | churned | `enums.studentStatus.churned` | وقف | neutral | struck |
| **subscription_status** | trial | `enums.subscriptionStatus.trial` | تجريبي | neutral | hollow |
| | active | `enums.subscriptionStatus.active` | مشترك | ok | fill |
| | paused | `enums.subscriptionStatus.paused` | متوقف مؤقتًا | neutral | half |
| | expired | `enums.subscriptionStatus.expired` | الباقة خلصت | act | struck |
| | unpaid | `enums.subscriptionStatus.unpaid` | مش مدفوع | act | hollow |
| **attendance** | on_time | `enums.attendance.on_time` | حضرت في الموعد | ok | fill |
| | late | `enums.attendance.late` | حضرت متأخرة | bad | half |
| | excused | `enums.attendance.excused` | اعتذرت مسبقًا | neutral | struck |
| | absent | `enums.attendance.absent` | غياب بدون إشعار | bad | struck |
| **grade** | excellent | `enums.grade.excellent` | ممتاز | ok | 5 pips ◆◆◆◆◆ |
| | very_good | `enums.grade.very_good` | جيد جدًا | ok | 4 pips ◆◆◆◆◇ |
| | good | `enums.grade.good` | جيد | neutral | 3 pips ◆◆◆◇◇ |
| | acceptable | `enums.grade.acceptable` | مقبول | neutral | 2 pips ◆◆◇◇◇ |
| | needs_review | `enums.grade.needs_review` | يحتاج إلى مراجعة | act | 1 pip ◆◇◇◇◇ |
| **teacher_status** | active | `enums.teacherStatus.active` | شغال | ok | fill |
| | inactive | `enums.teacherStatus.inactive` | متوقف | neutral | struck |
| **job_applicant_status** | new | `enums.jobApplicantStatus.new` | جديد | neutral | hollow |
| | reviewing | `enums.jobApplicantStatus.reviewing` | تحت المراجعة | neutral | half |
| | interview | `enums.jobApplicantStatus.interview` | مقابلة | ok | hollow |
| | accepted | `enums.jobApplicantStatus.accepted` | اتقبل | ok | fill |
| | rejected | `enums.jobApplicantStatus.rejected` | اترفض | neutral | struck |

That is 42 values across the 8 enums that carry a state. `lead_source`, `program`, `package_size`, `gender` and `user_role` are labels, not states, and never get a chip. A new applicant is `neutral`, not `act`: hiring is not a «دورك» moment, which is why the «طلبات التوظيف» nav count stays ink-3. `interview` mirrors `trial_booked` (a good step that is booked and waiting) so the two funnels read the same.

The tone rule, applied mechanically:

- **act**: an admin must do something now.
- **bad**: a lesson did not happen as planned through someone's fault.
- **ok**: settled and good.
- **neutral**: informational, waiting on someone else, or closed.

Grade pips are ordinal, so grades read correctly in greyscale print. Filled pips come first, at the inline-start.

```ts
// packages/shared/src/status-style.ts  (shape only; labels come from ar.json)
export type Tone = 'ok' | 'act' | 'bad' | 'neutral';
export type Glyph = 'fill' | 'half' | 'hollow' | 'struck';
export interface StatusStyle { tone: Tone; glyph: Glyph }
export const lessonStatusStyle: Record<LessonStatus, StatusStyle> = {
  scheduled: { tone: 'act', glyph: 'hollow' }, confirmed: { tone: 'ok', glyph: 'fill' },
  completed: { tone: 'neutral', glyph: 'fill' }, late: { tone: 'bad', glyph: 'half' },
  excused: { tone: 'neutral', glyph: 'struck' }, no_show: { tone: 'bad', glyph: 'struck' },
  cancelled_by_teacher: { tone: 'bad', glyph: 'struck' }, cancelled_by_admin: { tone: 'neutral', glyph: 'struck' },
  rescheduled: { tone: 'neutral', glyph: 'half' },
};
// ...same shape for lead, student, subscription, attendance, teacher, jobApplicant; grade → { tone, pips: 1..5 }
// status-style.test.ts: for each of the 8 enum arrays in packages/shared/src/enums, assert every value has an entry.
```

### Package progress: one pure function (unit-tested, CLAUDE.md rule 4)

```ts
// packages/shared/src/package-progress.ts
export interface PackageProgress { used: number; total: number; remaining: number; remainingLabel: string; tone: 'act' | 'neutral' }
export function packageProgress(used: number, total: number): PackageProgress
```

Arabic agreement rules for `remainingLabel`:

| Remaining | Label |
|---|---|
| 0 | «الباقة خلصت» (= `enums.subscriptionStatus.expired`) |
| 1 | «فاضل حلقة» |
| 2 | «فاضل حلقتين» |
| 3–10 | «فاضل N حلقات» |
| 11 or more | «فاضل N حلقة» |

`tone` is `act` when `remaining <= 2` (the R-SUB-02 trigger). The function is used in the students hamish, the mobile card, the guardian portal and the PDF footer. It replaces the "constellation" sparkline idea.

### KPI strip (dashboard, Phase 5)

- Four `<button aria-pressed>` filters between two 3px double gold rules.
- Each shows an Amiri 700 numeral at 40px, Western digits, `ink`, with a 13px label underneath.
- A numeral turns saffron only when there is work behind it («3 حلقات يحتاج تأكيد», «3 باقات مش مدفوعة»).
- Never mix numeral systems in one tile.

---

## 7. Admin shell and navigation

```
┌ margin (bg-background) ───────────────────────────────────────────────┐
│ [ runhead: crumbs ………  Thu 1 Oct 2026 · 20 ربيع الآخر 1448 هـ | الرياض 15:20  القاهرة 15:20 ] │
│ ┌ page (jadwal) ──────────────────────────────┐  ┌ sidebar 236 ┐ │
│ │ [cartouche title] count        [secondary][primary] │  │ ۝ آيات البيان │ │
│ │ toolbar                                       │  │ fihris nav  │ │
│ │ table … │ حاشية                               │  │ ……          │ │
│ └──────────────────────────────────────────────┘  │ user · out  │ │
└──────────────────────────────────────────────────────────────────────┘
```

- **Sidebar = fihris (surah index):** 236px in the margin, with no panel.
  - Groups are separated by 14px of space only: dashboard / المحادثات + طلبات التوظيف / الطلاب, المعلمين, الجدول, التقارير, الاشتراكات.
  - Each item: icon (18) + label, a dotted leader (`border-top: 1.5px dotted var(--rule-strong)`, flex 1) and a count.
  - Counts are 12px `ink-3`. When the count is work for the admin it is saffron 700 and says what it is: «11 جديدة», «3 يحتاج تأكيد», «2 ما اتبعتش», «3 مش مدفوع».
  - Active: `aria-current="page"`, `bg-page` tile with a `rule-strong` ring, lapis icon, weight 600.
- **Running head** (`text-xs text-ink-3`): breadcrumbs at the start; at the end the Gregorian date, Hijri date, a 1px divider, then `الرياض 15:20` and `القاهرة 15:20` with the times in ink-2 600. Add a third clock only when a relevant zone differs. It is hidden below 640px.
- **Under 900px:** the sidebar becomes a top row (mark + horizontally scrolling nav, with a mask fade at the inline-end as the "more" cue). Only saffron counts stay; leaders and the user block hide.
- **Under 640px:** the admin web is usable but secondary. The Expo app is the mobile admin surface.
- Teacher and guardian shells use the same margin/page/cartouche, without the fihris. They use a top bar with the mark, title and logout, controls at the 48px size, and `text-body` copy.

---

## 8. Availability grid (R-TCH, R-SCH)

- **Rows:** a `role="table"` grid with columns `day 92 | ranges 452 | track 1fr`, ordered Saturday to Friday. Today's row gets a `gold-wash/40` tint and «النهارده» under the day name.
- **Ranges:** each range is `[من select] إلى [إلى select] [× remove]`. The selects are `h-8` at 13px tabular, with times in 30-minute steps in the teacher's tz. A dashed `+` adds a range, and empty days show «لسه مفيش مواعيد متاحة» + ghost «إضافة ميعاد». The select rows **are** the keyboard path.
- **Track:** 08–24 with a hairline every 2h and an axis on top.
  - It runs right to left, like the text (`inset-inline-start`).
  - Available bars: `gold-wash` with a `gold` 1px border.
  - Booked lessons: 6px `ink-2` ticks inside.
  - Overlap: a cinnabar 1.5px border plus a 45° hatch.
  - Now: a 2px ink line on today's row.
  - The band being edited: a lapis 1.5px border with a 3px lapis/22% halo and two 5×14 lapis grips at the ends. Phase 2 makes those grips draggable in 30-minute steps; the selects stay the accessible path.
- **Overlap:** the whole row gets a `cinnabar-wash/55` tint, the offending select gets `aria-invalid` and `aria-describedby`, and the error sits under the row: struck glyph + `availability.overlap` + «من 17:30 لحد 18:00». «حفظ المواعيد» stays enabled, but the save is refused with focus moved to the first error.
- **Zone:**
  - A tz select «القاهرة (Africa/Cairo)» plus a seg «بتوقيتها | بتوقيت الرياض».
  - A note line uses `availability.tzHint` and carries the DST warning when a transition is inside 30 days, e.g. «من الجمعة 30 أكتوبر القاهرة بترجع ساعة».
  - Time-off uses `availability.timeOffTzHint`.
- **Time-off:** each entry shows a date range, the reason, a delete icon button, and an impact note (`note--act`) such as «4 حلقات واقعة في الإجازة دي ومحتاجة ميعاد جديد» with the link «انقل الحلقات».
- **Mobile:** the day becomes a header line, the selects are 16px/40px, the track is full width, and the shared axis is shown once at the top.

---

## 9. Inbox row (R-LEAD-02/04/05)

- **Grid:** `38px avatar | 1fr | 156px status | 184px actions`. Column widths are fixed so chips line up across rows.
  - Line 1: unread saffron 7px dot (+ sr-only «رسالة جديدة من») · **name** (700 if unread) · E.164 phone (ltr, 12px) · source (12px ink-3) · age at the inline-end (12px tabular).
  - Line 2: the last message, one line with an ellipsis. Outbound messages get the prefix «إنت:» in ink-3.
  - Line 3 (optional): a marginal note for the automated follow-up, «المتابعة الجاية: بكرة 10:00، رسالة تلقائية بميعادين فاضيين» (R-LEAD-05).
- **Next action is always visible:** a secondary `sm` button per status, followed by the reclassify icon (briefcase, `aria-label` «نقل لطلبات التوظيف») and ⋮.

| Status | Next-action button |
|---|---|
| جديد / مردّش | رد |
| مهتم بدون ميعاد | اقترح ميعاد |
| حجز حلقة تجريبية | فتح الحلقة |
| حضر الحلقة التجريبية | تحويل لطالب (`leads.convert`) |
| lost | none |

- **Suspected job seeker:** the row is tinted `gold-wash/50`, and an inline confirm strip shows «شكلها طلب توظيف مش طالب.» + `leads.reclassifyConfirm`, with [سيبها هنا (ghost)] [نقل لطلبات التوظيف (primary)].
- **Status filter:** a vertical `role="tablist"` fihris in funnel order: الكل 107 / جديد … مشترك / مردّش, عميل ضايع. It has dotted leaders and counts like page numbers, and the selected item is a `gold-wash` tile with a `gold-soft` ring. Under 900px it becomes horizontal scrolling chips.
- **Under 1240px:** the text buttons hide (the actions column becomes 76px). Under 640px, actions move into the row's detail view.

---

## 10. Empty states, toasts, alerts

- **Empty state:**
  - A dashed `rule-strong` box with a 56px gold double-outline rhombus (no rosette).
  - An Amiri `text-h3` title from i18n (`students.empty` «لسه مفيش طلاب»).
  - One sentence saying how the list fills.
  - One primary action.
- **Toast** (bottom inline-end, 200ms in, 5s; actions keep it open until hover-out):
  - `bg-inverse text-on-inverse rounded-lg shadow-toast`, with a 13px `inverse-gold` filled nuqta.
  - The action is a text button in `on-inverse`, 700, underlined («افتح الملف», «تراجع»). It is never gold text and never lapis on ink.
  - The wording follows the same verb as the action (`students.created` «الطالب اتسجل»).
- **Error toast:** `bg-danger-soft text-ink` + a cinnabar struck glyph + a lapis underlined «جرّب تاني».
- **Inline alert** (form level): `bg-danger-soft` with an inset 1px `danger/35` ring, struck glyph, and `auth.invalidCredentials`-style copy.
- **Field error:** 13px cinnabar with a struck glyph under the field, linked via `aria-describedby`.

---

## 11. Logo

Files in this folder:

| File | What it is |
|---|---|
| `logo.svg` | Mark for 32px and up |
| `logo-small.svg` | Mark for 28px and below: no inner ring, heavier strokes, so the alef-madda never reads as «T» or «1» |
| `logo-app-icon.svg` | 1024² on cover ink |
| `logo-lockup.svg` | Mark + wordmark |

- **Construction:** the verse-end rosette (12 lobes) holds an alef with a madda: «آيات» = verses. The wordmark «آيات البيان» is Amiri 700, with «أكاديمية» in Plex above it.
- The alef and madda are drawn as Naskh strokes, following Amiri: the alef has a thin angled head, a belly in the upper third and a tapered foot; the madda is a bar that drops at its left end and flicks up at its right. The earlier stick-and-tilde read as a Latin «Ĩ».
- **Colours:** gold `#C59542` mark on light; `#DFB76C` on `--cover` / dark. The wordmark is in `--ink` (light) or `#DFB76C` (cover).
- **Clear space:** 0.5× the mark height on all sides.
- **Minimum size:** 16px for `logo-small.svg`; switch to `logo.svg` at 32px or more.
- **The wordmark in `logo-lockup.svg` is live text.** Outline it to paths with Amiri installed before using it in email, print or the app store.
- Never: recolour the mark lapis, put it on photos, add a crescent or stars, or strike it through.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="آيات البيان">
  <path fill="none" stroke="currentColor" stroke-width="2" d="M32 7A7 7 0 0 1 44.5 10.35A7 7 0 0 1 53.65 19.5A7 7 0 0 1 57 32A7 7 0 0 1 53.65 44.5A7 7 0 0 1 44.5 53.65A7 7 0 0 1 32 57A7 7 0 0 1 19.5 53.65A7 7 0 0 1 10.35 44.5A7 7 0 0 1 7 32A7 7 0 0 1 10.35 19.5A7 7 0 0 1 19.5 10.35A7 7 0 0 1 32 7Z"/>
  <circle cx="32" cy="32" r="17.5" fill="none" stroke="currentColor" stroke-width="1.25"/>
  <path fill="currentColor" d="M31.9 24.8L33.3 24.2C34.2 26.2 34.3 29 34.2 32.2C34.1 37.2 33.2 42.6 32.4 46.6C32.2 47.7 31 47.8 30.8 46.8C30.3 42.6 30.2 37.6 30.4 32.4C30.6 29.2 31 26.6 31.9 24.8Z"/>
  <path fill="currentColor" d="M38.6 17.4C37.6 18.7 36.2 19.1 34 18.9C31 18.6 28 18.3 26.5 18.9C25.6 19.4 25.2 20.6 25.4 22.1C26.1 21.5 26.8 21.3 27.6 21.2C29.6 21.1 31.6 21.7 34 21.7C36.5 21.7 38.1 20.1 38.6 17.4Z"/>
</svg>
```

Motif files:

| File | Contents |
|---|---|
| `motif-nuqta-glyphs.svg` | The 4 status symbols |
| `motif-rosette-number.svg` | The rosette that holds numbers |
| `motif-cartouche-cap.svg` | Cartouche end cap |
| `motif-binding.svg` | Login cover reference |

Put them in `packages/shared/assets/` and render them via an icon sprite (web) and `react-native-svg` (Expo).

---

## 12. React Native (Expo) theme

- RN has no oklch, so these are the same tokens as sRGB hex, read from the rendered page.
- Keep **one** source: `packages/shared/src/theme.ts` exports this object, and a small script generates the CSS raw-token blocks in section 3 from it. CI runs the contrast pairs against both themes.
- Needs `react-native-svg` (Nuqta, rosette and mark) and `@expo-google-fonts/amiri` + `@expo-google-fonts/ibm-plex-sans-arabic`.

```ts
// packages/shared/src/theme.ts
export const palette = {
  light: {
    margin: '#f2ead9', page: '#fbf8ef', raised: '#fefcf8', sunk: '#f5f0e3',
    ink: '#161f30', ink2: '#444d5e', ink3: '#5b6472',
    rule: '#dbd3c4', ruleStrong: '#c1b6a2', ruleInput: '#908572',
    gold: '#c59542', goldSoft: '#dbc090', goldWash: '#f6e6c7',
    lapis: '#264b99', lapisHover: '#183a83', lapisWash: '#dde8fd', onLapis: '#fbf8f1',
    ok: '#13684b', okSoft: '#d3f0e2',
    act: '#925019', actSoft: '#fde8cb',
    bad: '#ac312c', badSoft: '#ffe4e0', badSolid: '#b6322d', onBad: '#fbf8f1',
    neutralSoft: '#e2e6ee',
    inverse: '#192437', onInverse: '#f6f1e7', inverseGold: '#deb870',
    cover: '#142139', leather: '#4c2819', leatherDeep: '#371a0f', leatherLift: '#633d2c', goldOnCover: '#dfb76c', coverInk: '#ede7d9',
    scrim: 'rgba(19, 27, 41, 0.45)',
  },
  dark: {
    margin: '#090e18', page: '#111723', raised: '#171e2b', sunk: '#0d131d',
    ink: '#ede7db', ink2: '#c3bdb0', ink3: '#a39e91',
    rule: '#262e3c', ruleStrong: '#384355', ruleInput: '#656f81',
    gold: '#cca459', goldSoft: '#72592c', goldWash: '#2f210c',
    lapis: '#7facf0', lapisHover: '#95c0fe', lapisWash: '#1b2942', onLapis: '#080f1c',
    ok: '#7ecaa9', okSoft: '#112d21',
    act: '#f3ac75', actSoft: '#392311',
    bad: '#f58c81', badSoft: '#3b1c19', badSolid: '#d5584f', onBad: '#080f1c',
    neutralSoft: '#212730',
    inverse: '#e3decf', onInverse: '#131b29', inverseGold: '#996516',
    cover: '#19263f', leather: '#3d2014', leatherDeep: '#29120b', leatherLift: '#523122', goldOnCover: '#dfb76c', coverInk: '#ede7d9',
    scrim: 'rgba(1, 2, 5, 0.62)',
  },
} as const;

// RN 0.86 (Expo 57, New Architecture) takes CSS boxShadow strings. These are the main layer of each web elevation;
// the light page hairline (0 1px 0 at 4%) is dropped because RN cards already have a 1px border.
export const elevation = {
  light: {
    page: '0 18px 40px -18px rgba(22, 31, 48, 0.28)',
    pop: '0 30px 60px -20px rgba(5, 11, 24, 0.55)',
    toast: '0 12px 28px -12px rgba(5, 11, 24, 0.5)',
  },
  dark: {
    page: '0 18px 40px -16px rgba(0, 0, 0, 0.65)',
    pop: '0 30px 60px -20px rgba(0, 0, 0, 0.7)',
    toast: '0 12px 28px -12px rgba(0, 0, 0, 0.6)',
  },
} as const;

export const type = {
  display: 'Amiri_700Bold',
  ui: { 400: 'IBMPlexSansArabic_400Regular', 500: 'IBMPlexSansArabic_500Medium', 600: 'IBMPlexSansArabic_600SemiBold', 700: 'IBMPlexSansArabic_700Bold' },
  size: { '2xs': 12, xs: 13, sm: 14, body: 15, base: 16, lg: 18, h4: 20, h3: 23, h2: 28, h1: 32 },
  lineHeight: (size: number, display = false) => Math.round(size * (display ? 1.5 : 1.6)),
  tabular: { fontVariant: ['tabular-nums'] as const },
} as const;

export const shape = { radius: { xs: 2, sm: 6, md: 8, lg: 12, pill: 999 }, control: { dense: 32, default: 40, comfort: 48, touch: 44 } } as const;
export const space = [0, 4, 8, 12, 16, 24, 32, 48] as const;
export const motion = { fast: 120, base: 200 } as const; // honour AccessibilityInfo.isReduceMotionEnabled()
export type ThemeName = keyof typeof palette;
```

Expo specifics:

- `I18nManager.forceRTL(true)` at boot.
- Use `start`/`end` style props (`marginStart`, `paddingEnd`), never left/right.
- Mirror directional icons with `transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }]`.
- Text inputs are at least 16pt.
- Inherit the theme from `useColorScheme()`, with a manual override in settings.

**Today screen** (R-MOB-02):

- Header: Amiri «النهارده» + `logo-small`, then the date line «الخميس 1 أكتوبر، 20 ربيع الآخر. المواعيد بتوقيت الرياض».
- Filter pills with nuqta glyphs.
- A timeline: a 1.5px `ruleStrong` spine and 14px nuqta nodes (the same glyph and tone as the status).
- Past lessons collapse to one 42px dashed-rule row.
- A 2px ink **now-line** with an ink pill «دلوقتي 15:20». It is ink, not saffron, because "now" is not an action.
- Lesson cards carry a saffron 4px start border when they need confirmation, with [إلغاء secondary][تأكيد primary] at 44pt.
- The package line uses `packageProgress`.
- An optimistic inverse toast with «تراجع» stays until the WhatsApp send is queued.
- Bottom tabs: النهارده / المحادثات (saffron count badge) / الطلاب / المزيد.

---

## 13. Lesson-report PDF (R-REP)

- **Pipeline:** HTML template → headless Chromium `page.pdf({ format: 'A4', printBackground: true, margin: 18mm })` in the worker.
- **Fonts:** the two families are self-hosted woff2 loaded by `@font-face` with `font-display: block`. Never Google Fonts at render time. Wait for `document.fonts.ready` before printing. The fonts embed in the PDF, so it renders on any phone.
- **Always light tokens** (wrap in `data-theme="light"`) whatever the requester's theme, on `--raised` paper.
- **One page, fixed layout:** 1em = 14px at 794px (about 10.5pt). Top to bottom:
  1. Jadwal frame with the gold outline 0.35em outside the ink rule.
  2. Header: mark + «أكاديمية / آيات البيان» at the start, cartouche «تقرير الحلقة» at the end.
  3. Meta grid 3×2 between double gold rules: الطالبة + code, المعلمة, البرنامج, التاريخ, الميعاد with zone and duration, رقم الحلقة «6 من 8».
  4. Attendance chip.
  5. «اللي اتعمل في الحلقة» 2×2: التسميع, الحفظ الجديد, المراجعة, التجويد.
  6. «التقييم»: 6 rubric rows (label, 5 pips, grade word) beside an overall box (`gold-wash`, Amiri 2.6em grade word + pips).
  7. ملاحظات المعلمة | الواجب, then الخطة الجاية full width.
  8. Footer: the package line from `packageProgress` at the start, page number in the rosette in the middle, «اتبعت على الواتساب …» timestamp at the end.
- **Greyscale-safe:** the meaning is in words and pips, never colour alone.
- Text stays selectable; nothing is rasterised.
- File name: `AB-0183_2026-09-29_تقرير-الحلقة.pdf`.
- Lines from the Quran appear only as references (surah + āyah range), never as decorative text.

---

## 14. Arabic and RTL engineering rules (CI-reviewable)

1. `<html lang="ar" dir="rtl">`. Use logical properties only (`ps/pe/ms/me/start/end`, `inset-inline-*`, `border-inline-*`). Physical left/right are allowed only for genuinely physical things: the binding cover's corner pieces, emboss shading, `background-position` (no logical keyword exists).
2. **Never split an Arabic word across flex/grid items or boxed inline elements.**
   - Text nodes inside a `display:flex|grid` parent each become separate items, which breaks shaping. Wrap the whole run in one `<span>`.
   - To highlight a letter (duplicate dialog «سهيله» vs «سهيلة»), use a plain inline `<span>` with only `color` and `text-decoration` (`underline 2px`, offset 7px) inside that single run.
   - No padding, margin, border, background box or ZWJ hacks.
   - Add a `HighlightDiff` component plus a Playwright visual check at 2×.
3. The same applies to sentences with embedded numbers: `<p class="err"><Icon/><span>…من <span class=num>17:30</span> لحد …</span></p>`, never `<p class="flex">text <span/> text</p>`.
4. LTR islands (`AB-0183`, `+966 55 214 7730`, emails, URLs, `+966` inside an i18n string) are isolated with `dir="ltr"`/`<bdi>` and `white-space: nowrap`.
5. No four-value physical shorthands (`padding: 10px 10px 10px 14px`, `p-[…]` with four values): they silently put the wide side on the wrong edge in RTL. Write `padding-block` / `padding-inline` (`py-*` / `ps-*` / `pe-*`).
6. No `letter-spacing` and no `text-transform` on Arabic. No all-caps labels anywhere.
7. Line-height is at least 1.5 for any Arabic that can wrap. The Amiri cartouche band is 52px tall with the text at line-height 1, tuned for Amiri's tall alef and madda.
8. Directional icons mirror (chevrons, reply, back, «next», logout). Non-directional icons do not (search, clock, check).
9. Nothing below 12px, including tab-bar labels, axis ticks and badges.

---

## 15. Grafts adopted, and grafts declined

**Adopted:**

- Riwaq's single-inline-run diff highlight, which fixes Mushaf's broken «سهيلـ ه».
- Editorial Ledger's Hijri date in the running head (Western digits), the dot-leader fihris nav with meaningful counts, and Amiri KPI numerals (as filters, Western digits).
- Mistara's single-meaning attention colour (saffron = «دورك»), its construction-based glyph grammar, re-cut as the rhombic nuqta, and its phone input with E.164 preview and its control inventory.
- Night Recitation's always-visible next-action per inbox row, the now-marker on today's availability row, and the mobile timeline spine with a now-line.
- Riwaq's control heights 32/40/48 and age·city as the name sub-line.
- Inverse toast tokens, fixing the 1.89:1 dark failure.
- A 3:1 `--rule-input` boundary.
- The hamish container-query collapse.
- A warm leather Mamluk binding in both themes, replacing the khatam lattice and the black-and-gold dark cover.
- An oklab `color-mix` everywhere.
- Status glyphs moved off the rosette.

**Declined:**

- **Aref Ruqaa** for warm/guardian moments: a third family for a handful of headings, and Ruqaa reads informal and Egyptian-coded for Saudi families. Amiri already carries warmth through the copy.
- **Constellation / sparkline package glyph**: it added ink, not information. `packageProgress()` text replaces it.
- **Eastern-Arabic display numerals**: they break the one-numeral rule and the Hermes `Intl` risk.
- **Hover-only row actions**: they hide work from new admins.
- **Saffron primary buttons**: they would collide with the «دورك» meaning.
- **A struck rosette as "stopped"**: a sacred marker must never be struck through.

---

## 16. New copy to add to `ar.json` (used in the mocks, not in the file yet)

| Key | Text |
|---|---|
| `nav.schedule` | الجدول |
| `nav.reports` | التقارير |
| `nav.subscriptions` | الاشتراكات |
| `students.hamish` | حاشية |
| `students.ageCity` | `{age} سنين، {city}` (needs plural rules) |
| `alerts.lessonsLeft` | `packageProgress()` labels |
| `alerts.needsTeacher` | محتاج معلم/ة |
| `alerts.reportNotSent` | تقرير ما اتبعتش |
| `alerts.trialToday` | تجريبية النهارده {time} |
| `leads.reply` | رد |
| `leads.proposeSlot` | اقترح ميعاد |
| `leads.openLesson` | فتح الحلقة |
| `leads.keepHere` | سيبها هنا |
| `leads.looksLikeApplicant` | شكلها طلب توظيف مش طالب. |
| `leads.autoFollowUp` | المتابعة الجاية: {when}، رسالة تلقائية بميعادين فاضيين |
| `leads.you` | إنت: |
| `availability.today` | النهارده |
| `availability.dstNote` | … |
| `availability.timeOffImpact` | {n} حلقات واقعة في الإجازة دي ومحتاجة ميعاد جديد |
| `availability.moveLessons` | انقل الحلقات |
| `mobile.today` | النهارده |
| `mobile.now` | دلوقتي |
| `mobile.undo` | تراجع |
| `report.*` | التسميع، الحفظ الجديد، المراجعة، التجويد، التقييم، التقدير العام، ملاحظات المعلمة، الواجب، الخطة الجاية |

The **6 rubric names** (الحفظ، التسميع، أحكام التجويد، مخارج الحروف، المراجعة، التركيز والالتزام) are placeholders. Replace them with the real six from the «تقرير الحلقة» Google Form.

## 17. Known limits

- The board is a static mock with a little JS (the theme switch and the tokens table). Hover/focus/selected states are forced classes. The availability drag grips are drawn, not wired.
- The wordmark is live Amiri text and needs outlining for non-web use.
- The select chevron is a mid-grey data-URI that serves both themes, at about 3.5:1 on dark `raised`.
- Gold frames are 2.5:1 on light paper by design. They are ornament, and all structure is also carried by `rule-strong` and spacing.
- The Expo screen is an HTML approximation. Real RN needs `react-native-svg` for the glyphs and mark.
- The alef and madda in the mark are hand-drawn with Amiri as the reference. Have a calligrapher check them before the app-store icon and print.
- The rosette (ayah-end marker) as section number and current page, and the surah-header cartouche as a page title, borrow Mushaf devices for admin chrome. They never hold Quran text and never decorate, but get one sign-off from the academy's teachers before launch.
