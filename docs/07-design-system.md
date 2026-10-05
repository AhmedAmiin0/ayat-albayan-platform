# المِداد والذهب — Ink & Gold: the Ayat Al-Bayan design system

Implementation spec for `apps/web` (Tailwind v4 + shadcn/ui + TanStack Table), `apps/mobile` (Expo / React Native) and the lesson-report PDF worker.

**Brand alignment (2026-10-02).** The layout system below (jadwal frame, cartouche, nuqta glyphs, fihris, saffron = «دورك») is unchanged. Its colours and logo are now the academy's own brand: the palette `T` of the Apps Script «Brand» library (the one that already styles the PDF reports, emails and Sheets) and the real logo, the open Mushaf on a green rahle inside a gold eight-point star (`docs/design/brand/`, also on ayatalbayan.com). The source of truth for every colour value is `packages/shared/src/theme.ts`; `apps/web/src/styles/tokens.css` carries the same hex and a test diffs the two.
`docs/design/ink-and-gold.html` and `docs/design/logo*.svg` predate this: their layout still applies, but their lapis/navy palette and rosette mark are superseded.

**Copy language (owner, 2026-10-03).** UI copy is clear Modern Standard Arabic, not Egyptian dialect (CLAUDE.md rule 10). Arabic examples quoted in this document may still show the earlier Egyptian wording; `packages/shared/i18n/ar.json` is the source of truth for every string.

---

## 1. Concept

Every screen is a page of an illuminated Mushaf.

- **The margin (هامش)** is the app background. It holds the navigation, the running head (dates and clocks) and the per-row marginal notes.
- **The page (رَقّ)** is a lighter sheet inside a *jadwal*: a ruled frame with an ink rule and a gold rule. The work lives on it: tables, forms, dialogs.
- **The surah-header cartouche** appears once per screen and holds that screen's title.
- **The binding** (green leather, gold fillets, corner pieces, a central mandorla holding the academy emblem) appears once in the whole product: on the login screen.

Amiri, the revival of Cairo's Bulaq/Amiriya press Naskh, sets titles. IBM Plex Sans Arabic sets everything else.

### Principles (the rules reviewers enforce)

1. **Gold decorates, GREEN acts.** Gold (`--gold*`) never fills a button, a link or text. Anything clickable is the brand green (the `--lapis*` tokens, a historical name: their value is green), or neutral with a green focus ring. If you are reaching for gold to make something "important", use hierarchy instead. The `ok` status (brand green3 `#1E6B4C`) shares the green family on purpose, as in the brand's own reports («تم / حاضر»); it is never filled or underlined and always sits in a chip with its nuqta glyph, so it never reads as a link or a button.
2. **Saffron means «دورك» and nothing else.** Saffron marks only things an admin must act on now: «يحتاج تأكيد», new lead «جديد», «محتاج معلم/ة», «الباقة خلصت», «مش مدفوع», «تقرير ما اتبعتش», «فاضل حلقتين». It is never a button, a focus ring or a decoration. If nobody has to do anything, it is not saffron.
3. **Shape carries state; colour only confirms it.** Every status shows a nuqta glyph (fill, half, hollow or struck) **and** the ar.json word. Colour is the third channel, so no state is ever communicated by colour alone.
4. **One rosette, one cartouche, one filled button.** The verse-end rosette ۝ only ever holds a number (section, page, PDF page). It is never a status, never the logo and is never struck through. Each screen has exactly one cartouche (its title) and at most one filled primary button. The one exception is a list whose rows *are* the task: on the mobile «النهارده» screen every card that needs confirmation carries its own filled «تأكيد», because confirming is the only job on that screen.
5. **Arabic first, one numeral system.**
   - Titles are Amiri 700 at 20px or larger, with line-height 1.5.
   - UI text is Plex with line-height 1.6.
   - No letter-spacing and no case transforms on Arabic.
   - Western digits everywhere, tabular in data: codes, phones, times, money, counts, and the Hijri date as well.
   - Nothing below 12px anywhere, the PDF included (its smallest label is 0.86em = 12px at 794px).
   - LTR values are always isolated (`dir="ltr"` / `<bdi>`).
6. **Ornament sits outside the work.** Frames, cartouches and marginal notes sit around the data and never inside table cells, inputs or dense rows. Mobile drops the frame and cartouche entirely and keeps the nuqta, green and saffron.
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

## 3. Tailwind v4 tokens (`apps/web/src/styles/tokens.css` + `index.css`)

### Brand palette

The brand («Brand» Apps Script library, palette `T`) gives one light set. The tokens use it wherever it passes AA, and tune only where it does not; dark mode is the same family on a green-black «night Mushaf». Values are `packages/shared/src/theme.ts` (RN key in brackets where it differs).

| Token | Role | Light | Dark | Brand source |
|---|---|---|---|---|
| `--page` | the work page (رَقّ) | `#FDF8F0` | `#0C1913` | `T.paper`, the logo's own background |
| `--margin` | app background | `#F5EDDD` | `#07110C` | `T.sand` |
| `--sunk` | sunk rows, disabled | `#F7F0E1` | `#09150F` | `T.tint` |
| `--raised` | inputs, dialogs, menus | `#FFFDF9` | `#112019` | `T.card`, warmed |
| `--ink` | body text | `#14261E` | `#EFE8D8` | `T.ink` |
| `--ink-2` / `--ink-3` | secondary / meta text | `#3C4B44` / `#55625B` | `#C7BFAC` / `#A49D8B` | green-grey ink; `T.soft` `#8A8272` is 3.6:1 on paper, too faint for text |
| `--rule` | hairlines | `#E5D9BF` | `#1F3229` | `T.rule` |
| `--rule-strong` / `--rule-input` | frames / the 3:1 control edge | `#CDBB94` / `#958666` | `#2F463A` / `#5F766A` | darkened `T.rule` |
| `--gold` | ornament only | `#C2A24A` | `#CFB062` | `T.gold` |
| `--gold-soft` | inner gold fillet, hamish rule | `#D6BC80` | `#6C5A2B` | `T.goldSoft` |
| `--gold-wash` | cartouche, selected tile, availability bars | `#E7DAB4` | `#29230F` | `T.gold2` |
| `--lapis` (`lapis`) | **action**: primary fill, links, focus ring | `#14503A` | `#78C49C` | `T.green2`; dark lightened for AA |
| `--lapis-hover` | primary hover | `#0C2A1E` | `#92D4B0` | `T.green` |
| `--lapis-wash` / `--on-lapis` | accent row / text on the fill | `#E1EDE5` / `#FDF8F0` | `#122A1F` / `#06120C` | |
| `--verdigris` (`ok`) | settled and good | `#1E6B4C` | `#8FCF95` | `T.ok` = `T.green3` |
| `--saffron` (`act`) | «دورك» only | `#8C5212` | `#F2AA6B` | `T.warn` `#B4842A` is 3.17:1 on paper and only 10° of hue from gold, so it is darkened and turned 17° toward orange |
| `--cinnabar` (`bad`) / `-solid` | a lesson went wrong / destructive fill | `#9C3B2E` / `#9C3B2E` | `#F0927F` / `#D0604D` | `T.bad` |
| `--inverse` / `--on-inverse` | toasts | `#0C2A1E` / `#FDF8F0` | `#ECE4D2` / `#0C1913` | `T.green` on `T.paper` |
| `--cover`, `--leather*` | the login binding | `#0C2A1E`, `#14402F` … | `#0E2419`, `#123826` … | the brand's green header |
| `--gold-on-cover` / `--cover-ink` | binding wordmark / small line | `#D6BC80` / `#F3EAD6` | same | `T.goldSoft` |

The `--lapis*`, `--verdigris*`, `--saffron*` and `--cinnabar*` names are historical, kept so no component changed. Read them as action, ok, act and bad.

### The CSS

Raw tokens switch per theme. Tailwind maps them with `@theme inline`, which resolves at use-time, so theme switching needs no rebuild. The existing shadcn slot names (`background`, `card`, `primary`, `input`, `ring`, `destructive`, ...) are kept, so `button.tsx` and `input.tsx` keep compiling.

```css
@import 'tailwindcss';

/* `dark:` follows the attribute. Set data-theme on <html> at boot ("auto" resolved via matchMedia),
   so tokens and dark: utilities always agree. The media query below is the no-JS fallback. */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

/* ---------- light (also any element with data-theme="light", e.g. the PDF preview) ---------- */
:root,
[data-theme='light'] {
  color-scheme: light;
  --margin: #f5eddd;
  --page: #fdf8f0;
  --raised: #fffdf9;
  --sunk: #f7f0e1;
  --ink: #14261e;
  --ink-2: #3c4b44;
  --ink-3: #55625b;
  --rule: #e5d9bf;
  --rule-strong: #cdbb94;
  --rule-input: #958666;
  --gold: #c2a24a;
  --gold-soft: #d6bc80;
  --gold-wash: #e7dab4;
  --lapis: #14503a;
  --lapis-hover: #0c2a1e;
  --lapis-wash: #e1ede5;
  --on-lapis: #fdf8f0;
  --verdigris: #1e6b4c;
  --verdigris-wash: #dcebdf;
  --saffron: #8c5212;
  --saffron-wash: #f6e7c6;
  --cinnabar: #9c3b2e;
  --cinnabar-solid: #9c3b2e;
  --cinnabar-wash: #f8e1db;
  --on-cinnabar: #fdf8f0;
  --neutral-wash: #e9e7dd;
  --inverse: #0c2a1e;
  --on-inverse: #fdf8f0;
  --inverse-gold: #d6bc80;
  --cover: #0c2a1e;
  --leather: #14402f;
  --leather-deep: #0b281c;
  --leather-lift: #1f553f;
  --gold-on-cover: #d6bc80;
  --cover-ink: #f3ead6;
  --scrim: rgba(12, 38, 28, 0.45);
  --elev-page: 0 1px 0 rgba(20, 38, 30, 0.04), 0 18px 40px -18px rgba(20, 38, 30, 0.28);
  --elev-pop: 0 30px 60px -20px rgba(4, 16, 11, 0.55);
  --elev-toast: 0 12px 28px -12px rgba(4, 16, 11, 0.5);
}

/* ---------- dark ("night Mushaf", green-black): no-JS fallback ---------- */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
    --margin: #07110c; --page: #0c1913; --raised: #112019; --sunk: #09150f;
    --ink: #efe8d8; --ink-2: #c7bfac; --ink-3: #a49d8b;
    --rule: #1f3229; --rule-strong: #2f463a; --rule-input: #5f766a;
    --gold: #cfb062; --gold-soft: #6c5a2b; --gold-wash: #29230f;
    --lapis: #78c49c; --lapis-hover: #92d4b0; --lapis-wash: #122a1f; --on-lapis: #06120c;
    --verdigris: #8fcf95; --verdigris-wash: #112a17;
    --saffron: #f2aa6b; --saffron-wash: #36220f;
    --cinnabar: #f0927f; --cinnabar-solid: #d0604d; --cinnabar-wash: #3a1914; --on-cinnabar: #06120c;
    --neutral-wash: #1d2621;
    --inverse: #ece4d2; --on-inverse: #0c1913; --inverse-gold: #8a6a1c;
    --cover: #0e2419;
    --leather: #123826; --leather-deep: #0a2117; --leather-lift: #1b4a35;
    --scrim: rgba(1, 5, 3, 0.62);
    --elev-page: 0 0 0 1px rgba(0, 0, 0, 0.25), 0 18px 40px -16px rgba(0, 0, 0, 0.65);
    --elev-pop: 0 30px 60px -20px rgba(0, 0, 0, 0.7);
    --elev-toast: 0 12px 28px -12px rgba(0, 0, 0, 0.6);
  }
}

/* ---------- dark: chosen or resolved at boot ---------- */
[data-theme='dark'] {
  color-scheme: dark;
  --margin: #07110c; --page: #0c1913; --raised: #112019; --sunk: #09150f;
  --ink: #efe8d8; --ink-2: #c7bfac; --ink-3: #a49d8b;
  --rule: #1f3229; --rule-strong: #2f463a; --rule-input: #5f766a;
  --gold: #cfb062; --gold-soft: #6c5a2b; --gold-wash: #29230f;
  --lapis: #78c49c; --lapis-hover: #92d4b0; --lapis-wash: #122a1f; --on-lapis: #06120c;
  --verdigris: #8fcf95; --verdigris-wash: #112a17;
  --saffron: #f2aa6b; --saffron-wash: #36220f;
  --cinnabar: #f0927f; --cinnabar-solid: #d0604d; --cinnabar-wash: #3a1914; --on-cinnabar: #06120c;
  --neutral-wash: #1d2621;
  --inverse: #ece4d2; --on-inverse: #0c1913; --inverse-gold: #8a6a1c;
  --cover: #0e2419;
  --leather: #123826; --leather-deep: #0a2117; --leather-lift: #1b4a35;
  --scrim: rgba(1, 5, 3, 0.62);
  --elev-page: 0 0 0 1px rgba(0, 0, 0, 0.25), 0 18px 40px -16px rgba(0, 0, 0, 0.65);
  --elev-pop: 0 30px 60px -20px rgba(0, 0, 0, 0.7);
  --elev-toast: 0 12px 28px -12px rgba(0, 0, 0, 0.6);
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

Measured contrast (WCAG 2.x, sRGB, both themes). CI checks every pair: `packages/shared/src/theme.contrast.test.ts` runs each text token (ink, ink-2, ink-3, green, ok, saffron, cinnabar) on each surface (margin, page, raised, sunk), each tone on its wash, ink and ink-2 on every wash, the text on every fill and the binding pairs, all at 4.5:1, plus the 3:1 control edges. A selection:

| Pair | Light | Dark |
|---|---|---|
| ink / margin | 13.61 | 15.72 |
| ink-2 / page | 8.70 | 9.86 |
| ink-3 / sunk | 5.63 | 6.91 |
| ink-3 / margin (lowest secondary-text pair) | 5.49 | 7.10 |
| lapis (green) / page (links, ghost buttons) | 8.87 | 8.74 |
| lapis (green) / raised | 9.23 | 8.18 |
| on-lapis / lapis (primary button) | 8.87 | 9.25 |
| on-lapis / lapis-hover | 14.54 | 11.16 |
| on-cinnabar / cinnabar-solid (destructive-solid button) | 6.45 | 4.97 |
| saffron / saffron-wash (act chip) | 5.15 | 7.71 |
| saffron / margin (fihris «دورك» count) | 5.42 | 9.81 |
| verdigris (ok) / verdigris-wash (ok chip) | 5.21 | 8.43 |
| cinnabar / cinnabar-wash (bad chip) | 5.45 | 6.86 |
| cinnabar / page (`text-destructive`, `text-danger`) | 6.45 | 7.84 |
| ink-2 / neutral-wash (neutral chip) | 7.42 | 8.49 |
| ink / gold-wash (cartouche, selected fihris tile) | 11.38 | 12.82 |
| on-inverse / inverse (toast and its action) | 14.54 | 14.26 |
| gold-on-cover / leather (binding wordmark) | 6.30 | 7.02 |
| cover-ink / leather (binding programme line) | 9.73 | 10.84 |
| **rule-input / raised** (input and secondary-button boundary, non-text needs 3:1) | 3.52 | 3.44 |
| rule-strong / raised (frames and hairlines only: never the only edge of a control) | 1.86 | 1.65 |
| gold / page (ornament only, exempt) | 2.32 | 8.62 |

`--cinnabar-solid` is a fill, never text: in dark it measures 4.69:1 on `--page`, 4.39 on `--raised` and 4.11 on `--cinnabar-wash`, so error labels would fail AA on raised surfaces. That is why `destructive` maps to `--cinnabar` (dark 7.84 / 7.33 / 6.86). In light the brand's `#9C3B2E` serves as both.

`packages/shared/src/theme.brand.test.ts` pins the light anchors to the brand values and keeps the one-meaning colours apart in OKLCH hue: saffron ≥ 20° from gold and from cinnabar, and the action inside the green range.

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
| **Verse-end rosette** (`motif-rosette-number.svg`) | Current page in pagination; section numbers; PDF page number. It only holds a number (the logo is the academy emblem, §11) | Status glyphs, bullets, empty states, anything struck through, decoration |
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
- Focus is the global green (`--lapis`) 2px outline at a 2px offset.
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
| 0 | «انتهت الباقة» (= `enums.subscriptionStatus.expired`) |
| 1 | «بقيت حلقة واحدة» |
| 2 | «بقيت حلقتان» |
| 3–10 | «بقيت N حلقات» |
| 11 or more | «بقيت N حلقة» |

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

- **Sidebar = fihris (surah index):** 236px, the Emerald Mint sidebar (`--cover` mint, a green-grey in dark) with a hairline at its inline-end (`border-e border-rule`), no panel.
  - **Rhythm (4px grid, logical properties only):** 24 above the logo, 24 logo → fihris, 16 between groups, 8 from a group label to its list, 4 between items. 12px of padding each side of the sidebar and 12px inside an item put the icon edge 24px from the sidebar edge; the logo, the group label («المالية») and the foot content all start on that same edge.
  - Each item: 40px tall (44 on phones and `pointer: coarse`), icon (18) + 8px + label. A label too long for 236px wraps to a second line (English «Your opinion matters»), never an ellipsis; a dotted leader (`border-top: 1.5px dotted var(--rule-strong)`, flex 1) and a count follow it.
  - Counts are 12px `ink-3`. When the count is work for the admin it is saffron 700 and says what it is: «11 جديدة», «3 يحتاج تأكيد», «2 ما اتبعتش», «3 مش مدفوع».
  - Active: `aria-current="page"`, a `bg-page` tile, green icon, weight 600, and a 4px green bar (`--lapis`) inset 8px top and bottom at the inline-start edge. Hover is `leather-deep`; focus is the global 2px green outline.
  - **Foot** (theme, language, account, logout): `sticky` at the bottom of the sidebar's own scroll area on the sidebar background, with a hairline above it, so it stays on screen on viewports under 1000px tall; it owns the 24px of bottom padding. The sidebar has `scroll-padding-block-end` of 176px (`shell:scroll-pb-44`, more than the foot is tall), so a focused or current link scrolls clear of the foot (WCAG 2.4.11).
- **Work page:** it scrolls inside `[data-page-scroll]` (PageFrame), never the document. That box has 4px of inline padding with a matching negative margin, so a full-width control keeps its whole focus ring (2px outline + 2px offset) instead of being clipped at the edge. A table wider than its column scrolls inside a `ScrollX` region: focusable, named by the table's caption, so the keyboard reaches it and the arrow keys scroll it. One filled primary per screen: on the schedule it is «حجز حلقة», and «اجتماع جديد» is an outline button.
- **Running head** (`text-xs text-ink-3`): breadcrumbs at the start; at the end the Gregorian date, Hijri date, a 1px divider, then `الرياض 15:20` and `القاهرة 15:20` with the times in ink-2 600. Add a third clock only when a relevant zone differs. It is hidden below 640px.
- **Under 900px:** the sidebar becomes a top row (mark + horizontally scrolling nav). The strip fades at both edges (20px at the start, 40px at the end, flipped in LTR) as the "more" cue, items are 44px tall and never truncate, and the current item is scrolled to the centre of the strip when the route changes. Only saffron counts stay; leaders and the user block hide.
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
  - The band being edited: a green (`--lapis`) 1.5px border with a 3px green/22% halo and two 5×14 green grips at the ends. Phase 2 makes those grips draggable in 30-minute steps; the selects stay the accessible path.
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
  - The action is a text button in `on-inverse`, 700, underlined («افتح الملف», «تراجع»). It is never gold text and never green on ink.
  - The wording follows the same verb as the action (`students.created` «الطالب اتسجل»).
- **Error toast:** `bg-danger-soft text-ink` + a cinnabar struck glyph + a green underlined «جرّب تاني».
- **Inline alert** (form level): `bg-danger-soft` with an inset 1px `danger/35` ring, struck glyph, and `auth.invalidCredentials`-style copy.
- **Field error:** 13px cinnabar with a struck glyph under the field, linked via `aria-describedby`.

---

## 11. Logo

The logo is the academy's own, as on ayatalbayan.com and in the Apps Script «Brand» library: an **open Mushaf on a green rahle inside a gold eight-point star**, with rays rising from the spine. It replaces the rosette-and-alef mark this system first drew (`docs/design/logo*.svg`, retired).

Sources (`docs/design/brand/`, never edited):

| File | What it is |
|---|---|
| `logo.png` | Lockup: emblem + calligraphic «آيات البيان» + the tagline «رتّل بوعي، واحفظ بإتقان», 1536×1024 on ivory `#FDF8F0`. Email, print, store listing |
| `logo-mark.png` | The emblem alone, 1536×1024 on ivory. What the PDF report and emails use today |
| `logo-mark@198.png` | The same at 198px tall, as the Brand library caches it |

Derived by `node docs/design/brand/tools/build.mjs` (no dependencies: a node:zlib PNG codec and pixel ops beside it). Re-run it if the source changes; never hand-edit the outputs:

| Output | What it is |
|---|---|
| `docs/design/brand/logo-mark-transparent.png` | Master: the emblem on transparency, cropped tight. The paper **outside** the emblem is removed by a flood fill from the border (plus the two pockets the swirl ornaments enclose), and the band where strokes meet paper is un-blended, so the anti-aliasing is kept. The emblem keeps its own ivory (star field, pages), because it is the same colour as the paper and a colour key would hollow out the Mushaf |
| `docs/design/brand/logo-mushaf-transparent.png` | The Mushaf on its rahle alone, star field cleared above the pages: the mark for small sizes |
| `apps/web/public/brand/mark.png`, `mark-small.png` | What `<Mark>` shows (192px tall / 96px wide) |
| `apps/web/public/favicon.ico` (16, 32, 48), `favicon-16.png`, `favicon-32.png` | Tab icons: the Mushaf crop at 16 and 32, the full emblem at 48 |
| `apps/web/public/apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` | The emblem on brand paper `#FDF8F0`, 80% of the square |
| `apps/mobile/assets/icon.png` | 1024² app icon: emblem on brand paper, opaque (iOS refuses alpha) |
| `apps/mobile/assets/android-icon-foreground.png` / `-background.png` / `-monochrome.png` | Adaptive icon: the emblem at 50% (inside the 66dp safe circle) over solid paper; the monochrome is its line art for Android 13 themed icons |
| `apps/mobile/assets/splash-icon.png` | The emblem on transparency, 1024², for the splash on `#FDF8F0` |
| `apps/mobile/assets/brand/mark.png`, `mark-small.png` | What the RN `<Mark>` shows |

Use:

- **Components:** web `components/ui/mark.tsx` (`<Mark size labelled className>`, `<Logo collapse>`) and RN `src/ui/Mark.tsx` (`<Mark size labelled>`) render those PNGs in a square box, contained. **32px or less shows the Mushaf crop**; at that size the star frame and rays blur into a pale blot. The same rule makes the favicons. Decorative by default; `labelled` names it «آيات البيان».
- **Wordmark:** in the app it stays live Amiri 700 «آيات البيان» with «أكاديمية» in Plex above it (`<Logo>`), so it follows the theme. Outside the app, use `logo.png`, whose calligraphy is the brand's.
- **Colours:** never recoloured, tinted or turned monochrome in the UI. It is drawn on ivory and keeps that ivory inside the star, so on dark surfaces and on the green binding it reads as an inlaid medallion (as the brand email header shows it, on an ivory tile).
- **Clear space:** a quarter of the emblem's height on all sides; the binding's mandorla and the sidebar gap already give it that.
- **Minimum size:** 16px (the Mushaf crop). The full emblem starts at 33px.
- Never: put it on photos, crop it differently from the two masters, add a crescent or stars, strike it through, or set it in the rosette.

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
- Keep **one** source: `packages/shared/src/theme.ts` exports this object. `apps/web/src/styles/tokens.css` carries the same hex, and `tokens.test.ts` fails if any colour differs. CI runs the contrast matrix and the brand/hue checks against both themes (section 3).
- Needs `react-native-svg` (Nuqta, rosette; the mark is the brand PNG, section 11) and `@expo-google-fonts/amiri` + `@expo-google-fonts/ibm-plex-sans-arabic`.

```ts
// packages/shared/src/theme.ts
export const palette = {
  light: {
    margin: '#f5eddd', page: '#fdf8f0', raised: '#fffdf9', sunk: '#f7f0e1',
    ink: '#14261e', ink2: '#3c4b44', ink3: '#55625b',
    rule: '#e5d9bf', ruleStrong: '#cdbb94', ruleInput: '#958666',
    gold: '#c2a24a', goldSoft: '#d6bc80', goldWash: '#e7dab4',
    lapis: '#14503a', lapisHover: '#0c2a1e', lapisWash: '#e1ede5', onLapis: '#fdf8f0',
    ok: '#1e6b4c', okSoft: '#dcebdf',
    act: '#8c5212', actSoft: '#f6e7c6',
    bad: '#9c3b2e', badSoft: '#f8e1db', badSolid: '#9c3b2e', onBad: '#fdf8f0',
    neutralSoft: '#e9e7dd',
    inverse: '#0c2a1e', onInverse: '#fdf8f0', inverseGold: '#d6bc80',
    cover: '#0c2a1e', leather: '#14402f', leatherDeep: '#0b281c', leatherLift: '#1f553f',
    goldOnCover: '#d6bc80', coverInk: '#f3ead6',
    scrim: 'rgba(12, 38, 28, 0.45)',
  },
  dark: {
    margin: '#07110c', page: '#0c1913', raised: '#112019', sunk: '#09150f',
    ink: '#efe8d8', ink2: '#c7bfac', ink3: '#a49d8b',
    rule: '#1f3229', ruleStrong: '#2f463a', ruleInput: '#5f766a',
    gold: '#cfb062', goldSoft: '#6c5a2b', goldWash: '#29230f',
    lapis: '#78c49c', lapisHover: '#92d4b0', lapisWash: '#122a1f', onLapis: '#06120c',
    ok: '#8fcf95', okSoft: '#112a17',
    act: '#f2aa6b', actSoft: '#36220f',
    bad: '#f0927f', badSoft: '#3a1914', badSolid: '#d0604d', onBad: '#06120c',
    neutralSoft: '#1d2621',
    inverse: '#ece4d2', onInverse: '#0c1913', inverseGold: '#8a6a1c',
    cover: '#0e2419', leather: '#123826', leatherDeep: '#0a2117', leatherLift: '#1b4a35',
    goldOnCover: '#d6bc80', coverInk: '#f3ead6',
    scrim: 'rgba(1, 5, 3, 0.62)',
  },
} as const;

// RN 0.86 (Expo 57, New Architecture) takes CSS boxShadow strings. These are the main layer of each web elevation;
// the light page hairline (0 1px 0 at 4%) is dropped because RN cards already have a 1px border.
export const elevation = {
  light: {
    page: '0 18px 40px -18px rgba(20, 38, 30, 0.28)',
    pop: '0 30px 60px -20px rgba(4, 16, 11, 0.55)',
    toast: '0 12px 28px -12px rgba(4, 16, 11, 0.5)',
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

- Header: Amiri «النهارده» + the emblem at 28pt (the Mushaf crop, §11), then the date line «الخميس 1 أكتوبر، 20 ربيع الآخر. المواعيد بتوقيت الرياض».
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
  2. Header: the emblem (`logo-mark-transparent.png`) + «أكاديمية / آيات البيان» at the start, cartouche «تقرير الحلقة» at the end. The brand's Apps Script `reportHtml` frames its certificate the same way (2px `T.gold` outside a 1px `T.goldSoft`), so the two reports read as one family.
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
- A green leather Mamluk binding in both themes (the brand green, 2026-10-02; it was warm brown), replacing the khatam lattice and the black-and-gold dark cover.
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
- In the app the wordmark is live Amiri text; anywhere else use the brand lockup `docs/design/brand/logo.png`.
- The select chevron is a green-grey (`#7A867F`) data-URI that serves both themes: 3.7:1 on light and 4.5:1 on dark `raised`.
- Gold frames are 2.3:1 on light paper by design. They are ornament, and all structure is also carried by `rule-strong` and spacing.
- The Expo screen is an HTML approximation. Real RN needs `react-native-svg` for the glyphs (the mark is a PNG).
- The emblem is a raster (1536×1024 source). The 512/1024 icons are downscaled from it and are sharp; anything larger than the source (print, a billboard) needs a vector from the logo's designer.
- The native splash needs the `expo-splash-screen` config plugin, which is not installed: `splash-icon.png` is ready, and is wired as `["expo-splash-screen", { "image": "./assets/splash-icon.png", "imageWidth": 200, "backgroundColor": "#FDF8F0", "dark": { "backgroundColor": "#07110C" } }]` once the package is added.
- The rosette (ayah-end marker) as section number and current page, and the surah-header cartouche as a page title, borrow Mushaf devices for admin chrome. They never hold Quran text and never decorate, but get one sign-off from the academy's teachers before launch.
