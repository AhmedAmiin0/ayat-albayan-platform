# Web design-system audit: family-web and web-kit

Ayat Al-Bayan, `develop` @ `35fb46a2e` (read-only checkout `<develop checkout>`), 2026-11-19. Every fact below was re-checked by a verifier; claims the verifiers refuted have been dropped.

Path prefixes: `fw/` = `apps/family-web/src`, `wk/` = `packages/web-kit/src`.

## For the owner (plain language)

1. The family website mostly uses the shared building blocks correctly. Off-scale sizes and colours are rare: about 1 per 100 lines of code.
2. The weak spot is underneath. The website and the phone app keep separate copies of text sizes, corners and shadows, and no automatic check keeps them the same.
3. Users can hit three problems today:
   - The red count on the bell cannot be read in dark mode.
   - When a page fails to load, the child summary card shows "no report yet" instead of an error.
   - In dark mode, a selected choice looks weaker than an unselected one.
4. Of the three calm designs, "quiet" fits what we already have best. We can move to it one screen at a time, without a second set of colours.
5. The cloud job's redesign branch should not be merged as it is. It adds a second set of colours and would restyle every family screen at once. Three decisions are yours first: the dark background (all three designs use near-black, which your own rule forbids), the font, and the logo tile.

---

## Design System Audit

### Summary

- **Screens reviewed:** 12 family-web route files and 31 feature files.
- **Components reviewed:** 40 kit primitives (`wk/components/ui`, non-test `.tsx`) and 30 portal files.
- **Issues:** 12 token-system defects, 13 primitives with gaps, 12 extraction candidates, 9 UX tells (code candidates), 7 dark-mode contrast pairs.

Usage drift is low. Every category scores below 0.5 per 100 lines except spacing, which is "Drifting". The real defects sit in the token system itself and in a handful of primitives.

### Token coverage

Scores are escapes per 100 lines of code. The line counts are 1786 for family-web and 11648 for web-kit (6497 if only `.tsx` files are counted). Staff-web counts are given for context only.

| Category | Tokens defined | Escapes fw / wk | Score fw / wk | Worst offenders |
|---|---|---|---|---|
| Colours | 39 colours + `brandTile` (`catalog theme.ts:13-24`). `tokens.css` has 42 variables × 3 blocks. 56 `--color-*` aliases (`wk/index.css:48-116`) | 1 / 0 off-palette classes. There are no hex colours in class strings (the `#752`/`#748` hits are PR numbers). | 0.06 / 0.0 | `fw/features/shell/Bell.tsx:21` `text-white`. Staff-web adds `bg-white` ×3 (`EvolutionQrAnswer.tsx:19`, `StarterToggle.tsx:33`, `QrCard.tsx:27`) |
| Spacing | No `--spacing` override; the catalog `space` scale is unused on web | 21 / 103: 13 / 81 off the grid, plus 8 / 22 on the grid but not a catalog step | **1.18 / 0.88** (1.59 tsx-only) | `gap-[22px]` 11 uses (3 fw / 4 wk / 4 staff), `p-[3px]` (`segmented-control:32`) |
| Arbitrary px (any utility) | none | 6 / 35 (staff 157) | 0.34 / 0.30 | `max-w-[720/420/400px]` (`FamilyShell:29`, `WrongApp:13`, `LoginPage:17`), `StatusChip :32` |
| Typography | 12-step ramp (`wk/index.css:20-31`). 3 steps are dead (h1, display, hero) and `body` equals `base` | 0 / 12 `text-[…]` (staff 19), plus 10 default `leading-*` in wk | 0.0 / 0.10 (0.19 with leading) | `avatar.tsx:28-30` `text-[15/26/34px]`, `Drawer.tsx:43` `text-[22px]`, `tab-parts` `text-[11px]` |
| Radius / shadow / motion | Radius: sm/md/lg (lg = 12px). Shadow: 3 `--elev`. Motion: one curve written 4×, no duration tokens | 0 / 12: rounded 1, shadow 5, duration/scale 6 (staff 19 / 8 / 19) | 0.0 / 0.10 | `button.tsx:13` `duration-[120ms] scale-[0.98] size-[17px]`, `segmented-control:43` |
| Breakpoints | `shell` and `sm` | 0 / 13 arbitrary (12 are `max-[480px]` in radio-chips; 1 is a comment) | 0.0 / 0.11 | four sets in use (defect 5) |

### Token-system defects (the real findings)

| # | Defect | Evidence |
|---|---|---|
| 1 | Web reads none of the catalog's type, shape, space, motion or elevation scales | Grep over fw, wk and staff-web finds 0 hits. The only importers are `mobile-kit/src/theme.ts:1` and `family-mobile/src/child/use-tab-motion.ts:3`. |
| 2 | Web and mobile values differ | The type ramp runs sm 15/14 … h1 30/32 (web/mobile). `--elev-*` ≠ catalog `elevation` (`theme.ts:49-58`), even though the comment at `theme.ts:48` says they are the same. |
| 3 | Tests cover colour only | `tokens.test.ts` maps 39 names and skips `--elev` (`:58`). `brandTile` is pinned only in the palette (`theme.brand.test.ts:31-34`), and nothing diffs its copies (`wk/index.css:41`, `index.html:17`, `manifest.json:9-10`). `motion.test.ts` checks a 120–220 ms range; it does not keep web and mobile in sync. |
| 4 | Scales are left open | There is no `--*: initial`, so Tailwind's defaults stay live:<br>• `rounded-xl` = 12px and `rounded-2xl` = 16px<br>• `text-xl`/`2xl`/`5xl`<br>• `font-extrabold` (800 is not loaded, so the browser fakes the bold)<br>That gives 13 hits in staff + wk (`CountryPicker.tsx:50` `text-xl`, `VideoTile.tsx:49` `text-5xl`) and 0 in fw + portal. |
| 4b | Default `leading-*` overrides the ramp's paired line-heights | wk has 10. `button.tsx:13` sets `leading-tight` (1.25) against the 1.6–1.65 the kit uses for Noto Arabic. `dialog-header.tsx:51` and `Drawer.tsx:43` set `leading-normal` over h3's 1.45. Staff-web has 34 more. |
| 5 | Four breakpoint sets | `sm`/`max-sm` 135, `shell` 48, `lg`/`xl` 13 (`RoomStage.tsx:26-54`, `rail.ts:10`), `max-[480px]` 12 |
| 6 | No motion tokens | The curve is written 4× (`motion.css:5,7,8,9`) and `--ease-ink` has 0 uses. `duration-[120ms]` appears 21× (0 fw / 4 wk / 17 staff). |
| 7 | Two names for one colour | `bg-card` 10 / `bg-page` 11; `text-destructive` 4 / `text-danger` 8; `bg-accent` 8 / `bg-lapis-wash` 4; `bg-primary` 1 / `bg-lapis-fill` 1 |
| 8 | Dead names | Aliases with 0 uses in all three apps: card-foreground, popover-foreground, muted, muted-foreground, accent-foreground, border, leather. Type steps h1, display and hero are dead (`index.css:29-31`). |
| 9 | Equal raw values | Light: `--lapis-wash` = `--cover` = `--leather` (#ecfdf5), `--ink` = `--inverse`, `--gold-soft` = `--inverse-gold`. Dark: `--ink` = `--cover-ink`. |
| 10 | Duplicate font variable | `--font-display` is used 30× in scope (fw 11, wk 19) and 67× in staff-web |
| 11 | Stale comments | `tokens.css:1` and `theme.ts:1` name paths that do not exist (`packages/shared/src/theme.ts`, `…/theme/avatar-tones.ts`, `apps/staff-web/src/styles/`). The `tokens.test.ts:55` title is stale, and so is `theme.ts:48`. |
| 12 | Missing 22px step | `gap-[22px]` ×11, `text-[22px]` ×3, `text-[26px]` ×2, `text-[15px]` ×1 |

### Component completeness

None of the literals below carries the "one-off, with a comment" exemption (SKILL.md:64).

| Component | Variants | States | Overrides | Tokens | Notes |
|---|---|---|---|---|---|
| Button | OK | Pressed is a scale only (`button.tsx:13`). No `loading`. No default `type`. | OK | `duration-[120ms]`, `scale-[0.98]`, `size-[17px]`, `leading-tight` | `min-h-11 w-full` is hand-added at 5 sites (`PhoneStep:31`, `StudentPasswordForm:36`, `PasswordForm:74`, `RequestStep:38`, `CodeStep:67`), so Button needs a `block` option. A filled primary sits on every list row (`HistoryRow:34`, `ReportRow:35`), against `button.tsx:6` ("at most ONE filled primary per section"). |
| IconButton | OK | `type="button"` default (`:18`), `pointer-coarse:size-11` (`:14`) | OK | OK | The model the others should follow |
| Field | OK | OK | **no className** (`field.tsx:28,40`) | OK | |
| SegmentedControl | OK | `role=group` (`:30`) | OK | `p-[3px]` `:32`, `sm:min-h-[30px]` `:41`, arbitrary shadow `:43` | Rendered via AccountPage → ThemeToggle |
| RadioChips | OK | In dark, the selected edge is weaker than the unselected one (see dark table) | **no className** | `max-[480px]` ×12 | |
| Tabs | OK | OK | OK | `py-[7px]`, `border-b-[1.5px]`. TabBadge uses `text-[11px]` (`tab-parts.tsx:9-10`) | 141 lines, close to the 150 cap |
| StatusChip | single look | always draws a glyph (`:37`) | OK | `h-[26px] ps-[9px] pe-[11px]` (`:32`) | Needs `pill` and `dot` looks |
| Avatar | OK | OK | OK | `text-[15/26/34px]` (`:28-30`) | `memo` at `:78` breaks the React Compiler rule (baselined in `eslint-suppressions.json`) |
| EmptyState | single | – | OK | OK | Dashed box with a gold rhombus SVG (`empty-state.tsx:24-25`) on 9 family paths: Alerts:28, Schedule:26, WithPick:17, ChildPage:25, StudentReports:21, LessonsPanel:22, HistoryPanel:36, PackagePanel:27, RecordingsPanel:37 |
| ListSkeleton | single | – | – | OK | Avatar + 2 lines (`skeleton.tsx:26-31`) is used by every portal `LoadState` (`:27`) and by `LoginPage:21`, so the skeleton shape does not match the content |
| Dialog | OK | Overlay has no `onClick` (`dialog.tsx:67`); no grab handle (`dialog-classes.ts:62-67`) | OK | OK | Reaches family via `PhoneStep` → `PhoneNumberField` → `CountryPicker:31` `layout="sheet"`. The scroll-lock effect (`:57`) is duplicated. |
| Drawer | single | Closes on X, Esc or a scrim tap (`:33`) | **no className** | `max-w-[460px]` `:40`, `text-[22px]` `:43` | Full-width on phones. Duplicate scroll lock (`:24`). Used by family: LessonCard → LessonOptionsBar → AskTimeDrawer:54 (adds `p-4` inside the drawer's own `px-5 py-4`) |
| MoreMenu / HeadActions / Pager | OK | Untyped Buttons: `pager.tsx:59,63`, `ConfirmSwitchDialog.tsx:33,36` | **no className** | OK | Staff-only except ConfirmSwitchDialog |

Cross-cutting checks:

- **Pressed and row feedback.**
  - Only `button.tsx:13` and `LessonAction.tsx:56` have a pressed style.
  - Rows have only `hover:`, which Tailwind v4 gates behind `(hover:hover)`, so on touch there is no designed row highlight (native-slop #13).
  - The browser's default tap highlight is not suppressed (0 `tap-highlight`).
- **`LessonAction.tsx:56`.** Its `transition-transform` replaces Button's colour transition through twMerge. It also scales while disabled, and reduced motion does not stop it: `index.css:129-134` turns off transitions, not transforms.
- **Touch targets.** OK: 44px minimum (`components.css:59-67`).
- **API calls in `.tsx` (rule 1).** 0 `apiFetch`, but `LessonAction.tsx:30-31` and `FileButtons.tsx:24-26` call `portalApi` from an inline `useMutation` inside a `.tsx`. Sibling hooks already exist (`use-family-action.ts`, `use-recordings.ts`).
- **Missing primitives.** Card, SectionHeader, DateTile, NewMark and a progress bar are missing; there are 0 `progressbar`, `<meter>` or `<progress>` in wk.

### Extraction candidates

1. **Card.**
   - 16 sites in 15 files; 15 are rendered in family-web.
   - Other counting rules give other numbers: the fit "recipe" regex finds 13, and `rounded-* + border` on one line finds 18. Staff-web has 79 sites in 75 files.
   - Padding varies across the 13 recipe sites, so Card needs `className` passthrough, not a fixed `p-4`:
     - `p-4` ×7
     - `p-3` ×3 (AlertRow, ReportRow, ScheduleRow)
     - `p-5` (LoginPage)
     - `p-6` (WrongApp)
     - none (PaymentsList)
   - Card in card: `wk/portal/recordings/LessonPanel.tsx:49` contains `wk/lesson-files/AudioPlayer.tsx:30`.
   - Boxes inside cards: `DeclinePanel:22`, `PackagePanel:69` inside `:55`. Both break `page.tsx:4-5` ("never nested, nothing boxed inside it").
2. **SectionHeader / MonthSection.** 10 rendered headings with drift between them: h2 vs h3, semibold vs bold, and `ReportSummary:15` and `PortalFileList:29` lack `text-ink-2`.
3. **NewMark** (or a StatusChip `pill` look). 8 hand-rolled pills, 4 rendered: `ChildSummaryCard:44`, `ReportRow:31`, `ScheduleRow:38`, `HistoryRow:18`. Padding differs (`px-1.5` vs `px-2`). `HistoryRow:17` names its local copy `NewMark`, the same name as `family-mobile ui/NewMark.tsx`.
4. **RoomOverlay** (the classroom takeover).
   - Appears at `LessonCard:28-36` and `fw/.../ScheduleRow:24-31`, both `fixed inset-0 z-50`.
   - It has no `role="dialog"`, no Esc handling and no scroll lock, and ScheduleRow renders it as an `<li>` (`:28`).
5. **Child header.** `ChildSummaryCard:32-52` and `ChildCard:48-67` are copies. ChildCard is staff-only (`GuardianHome.tsx:4`).
6. **ButtonRow.** Hand-rolled at `FileButtons:32` and `LessonOptionsBar:60`.
7. **BackLink.** `ChildPage:21` uses a `Link`; `ReportView:34` uses a `Button onClick`.
8. **Page title.**
   - Six titles are hand-rolled at 26px at every width.
   - Cartouche is 22px on phones and 26px from `sm` (`cartouche.tsx:18`), so swapping it in changes the phone size.
   - Cartouche's own sizes duplicate `--text-h3` and `--text-h2`.
9. **Form stack.** `gap-[22px]` at 7 sites: `PhoneStep:24`, `StudentPasswordForm:16`, `StudentSignIn:29`, `PasswordForm:48`, `ResetFlow:43`, `RequestStep:26`, `CodeStep:53`.
10. **Icon link.** `Bell.tsx:14` hand-rolls an icon link; `ChildSwitch.tsx:17` imitates a ghost Button.
11. **useScrollLock.** `dialog.tsx:57` and `Drawer.tsx:24` contain the same inline effect, and both are baselined in `no-restricted-syntax`.
12. **StatTiles.** `SummaryFigures:21` shows 3 tiles, or 4 when money is shown.

### UX tells (`native-slop.md`), RTL, dark mode

#7, #9, #17 and #19 can only be confirmed on a screenshot or a running app. Each is reported as a code candidate that has not been rendered.

| Tell | Verdict | Evidence |
|---|---|---|
| #1 Web modal | code | Classroom takeover (extraction 4); `CountryPicker:31` uses `layout="sheet"` |
| #2 X-button sheet | code | `dialog.tsx:67` (no scrim close), no grab handle, Drawer full width (`:40`) |
| #4 Gradient hero | clean, ornament remains | 0 gradients. EmptyState rhombus; `PrepareCard:19` `border-gold/40`; `jadwalClass` on every Dialog (`page.tsx:8-9`, `dialog.tsx:75`) |
| #7 Everything's a card | candidate | Per-row cards at `AlertRow:38`, `ReportRow:23`, `ScheduleRow:34`, `HistoryRow:59`, `LessonsPanel:26`, `RecordingRowButton:28`. The only grouped list is `PaymentsList.tsx:13`. |
| #9 Wireframe borders | candidate | Light `--page` = `--raised` = #fff (`tokens.css:13-14`), contrast 1.00. Rule vs raised is 1.24 light / 1.26 dark. |
| #11 Hand-rolled header | code | `FamilyShell:20` (English wordmark), `ChildPage:20-24`, `ReportView:34` |
| #13 Squish reflex | code | See component checks above |
| #14 Grand entrance | code | `ChildBody:54-55`, `ReportView:33`, `SignInWays:28`, 200 ms (`motion.css:5`); off under reduced motion |
| #19 Spinner blink and false empties | candidate | (a) to (d) below |

#19 details:

- **(a) Cold load.** The page shows a blank `#root` (`index.html:28`), then the `WithHome` skeleton (4 rows), then the panel skeleton. Meanwhile the tab bar grows from 3 to 4 items, because `familyPick` returns `LOADING` (`family-pick.ts:32`) and `TABS_OF.loading = NO_STUDENT` (`family-tabs.ts:12-17`).
- **(b) False empty.** `ChildSummaryCard:23` drops `loading`, and `use-child-summary.ts:23` reads no `isError`. A failed read therefore leaves «لم يصل تقرير بعد» (`child-summary.ts:44-47`) and "–" (`SummaryFigures:23`) on screen for good, with no retry.
- **(c) No router error or pending screen.** The routes define 0 `errorComponent`/`pendingComponent`, and `guard.ts:18-21` rethrows. That this shows TanStack's English default error screen is inferred, not run.
- **(d) Order of checks.** `LessonReportView:23` checks `isError` before `data`.

Clean: #3 (no emoji; flags come from `countries.ts:12`), #5, #6 (Noto Sans Arabic 400–700, `start-app.ts:4-7`), #8, #10, #12, #15. #16 does not apply on web. #20 was not assessed.

There are also two tab levels: `CHILD_TABS` has 6 entries (`client-core viewer.ts:66`). `WeekBar:16-34` is text-only, while `WeekSlotsFrame:54,62` uses chevrons.

**RTL is clean.**
- Physical utilities: 0 in fw, 2 in wk; both are safe-area insets (`StageScreen:41`), which is correct. Logical utilities: 4 in fw, 35 in wk.
- The drawer flip is at `motion.css:40-42`.
- Gaps:
  - `mirroring.test.tsx` lacks forward, send and external.
  - No lint guard bans physical utilities.

**Dark mode.** There are 0 `dark:` utilities; the tokens switch the theme.

| Pair | Light | Dark | Where |
|---|---|---|---|
| White on `bg-danger` (bell badge) | 6.47 | **1.90** | `Bell.tsx:20-21`; the boards make the same mistake (`native:68`, `quiet:74`, `brand:86`) |
| `border-primary` as the selected edge, on raised | 5.48 | **2.45** | `RecordingRowButton:28`, `radio-chips:48` |
| The same edge on lapis-wash | – | **2.24** | same |
| Unselected `border-input` edge on raised | – | 3.38 | The selected state is weaker than the unselected one |
| Selected fill (lapis-wash vs raised) | 1.05 | 1.09 | So "selected" rests on font weight alone |
| Unread vs read alert row | 1.00 | 1.15 | `AlertRow:39` (`bg-page` vs `bg-raised`) |
| Select chevron on raised | 3.79 | 3.55 | `components.css:5` claims 4.5:1 |

The browser and PWA bar colour is also out of step. `theme-color` and the manifest colours are #064E3B (`index.html:17`, `manifest.json:9-10`), with no dark variant. That paints the loudest brand green above a white header (9.72:1), against the owner's «not colorful».

### Priority actions

Duplicates across the four dimension reports are merged.

1. **Bell badge** (`Bell.tsx:20-21`): use `bg-destructive-solid text-destructive-foreground`. That gives 6.47 in light and 4.53 in dark, and the pair is already tested (`onBad`/`badSolid`).
2. **False empty and loading states.**
   - `useChildSummary`: base `loading` on all three queries and add `isError`; `ChildSummaryCard` renders both.
   - TabBar: reserve the 4th slot while `/portal/me` loads.
   - Router: add `defaultPendingComponent` and an Arabic `defaultErrorComponent`.
   - `LessonReportView`: check `data` first.
3. **Selection and surfaces.** Use `border-lapis` for the selected edge (9.08 dark, 5.48 light) and give the selected state a visible fill. Separate the ground from the cards (calm step 1), and fix read vs unread in `AlertRow:39`.
4. **Button.**
   - Add `loading`, a default `type="button"` and `block`.
   - Demote the per-row primaries.
   - Drop `LessonAction:56`.
   - Replace `duration-[120ms]`, `scale-[0.98]` and `size-[17px]` with tokens.
5. **Card + SectionHeader primitives**, in a folder that passes the folder cap (calm step 3).
6. **Type.**
   - Snap `text-[22px]` ×3, `[26px]` ×2 and `[15px]` ×1, and name the 22px step.
   - Add duration tokens and use `--ease-ink`.
   - Remove the default `leading-*` utilities from Button and the overlay titles.
7. **Tests and comments.**
   - Diff the `brandTile` CSS copies and `--elev` against `elevation`.
   - Add the contrast pairs above (badge, primary used as an edge, surface separation).
   - Fix the chevron comment and `theme.ts:48`, and drop the stale paths.
   - Add the forward, send and external mirroring cases.
   - Add a source scan that bans physical utilities.
8. **One RoomOverlay dialog** with `role="dialog"`, Esc and scroll lock. Also move the `portalApi` mutations into hooks and add `useScrollLock`.
9. **Close the scales** (`--color-*`, `--radius-*`, `--text-*: initial`) last.
   - First migrate `text-white` (`Bell.tsx:21`) and staff-web `bg-white` ×3.
   - Keep `--container-*`: 5 container queries in `classroom/room/livekit/stage.ts:28-31` and `max-w-3xl` in `ReportPage.tsx:20` use it.
   - Keep the `lg`/`xl` breakpoints (13 uses).

---

## Adopting the calm look

### Which variant fits the existing tokens

The ΔE tallies come from `calm-audit/compare.js`. A verifier re-ran the script but did not re-derive the role mapping inside it, so treat the counts as indicative.

| | native | **quiet** | brand |
|---|---|---|---|
| Light: exact / near / shift / conflict / new | 10 / 8 / 6 / 1 / 3 | 9 / 10 / 5 / 1 / 4 | 8 / 7 / 10 / 3 / 7 |
| Dark: exact / near / shift / conflict / new | 0 / 6 / 8 / 11 / 3 | 3 / 1 / 16 / 5 / 4 | 3 / 1 / 17 / 7 / 7 |
| Conflicts, light + dark | 12 | **6** | 10 |
| Light page | #f2f3f2 | #f6f7f6 (ΔE 0.004 from `--margin`) | **#fdfbf3 cream** |
| Dark page (kit `--margin` #1a211e) | #0f1211 | #0e1311 | #0b1712 |
| Font weights (Noto loaded at 400–700) | 800 ×44, 900 ×1 (faked) | **600/700 only** | 800 ×55, 900 ×1 (faked) |
| Dark primary button | Changes to #4fd39b with #05281a text; breaks the pin at `theme.brand.test.ts:24-25` | Keeps #047857 with white text | Keeps it |
| Card | 16px, shadow, no border (`native:255`) | 16px, 1px border, shadow (`:256`) | same as quiet (`:270`) |
| Child tabs | Segmented, `role=tab` (`:451-458`), needs a new look | Underline tablist, 48px (`:434-446`), same as `tabs.tsx:44` | Scroll-snap tablist (`:453`) |
| Extra structure | ListGroup, ListRow, separators, dateBlock, dot status | dateTile 56×56 r12, filled pill, lessonRow 72px | Dark-green header #163a2c (ΔE 0.685), gold focus |

**Verdict: adopt quiet.**

- **Reasons.**
  - It has the fewest conflicts (6).
  - It uses only weights that are already loaded.
  - It keeps the pinned dark primary.
  - It has no cream.
  - Its tabs match the existing Tabs, and it needs no ListGroup, ListRow or segmented control.
  - It even lint-flags the Amiri ornament (`quiet:178`).
- **The light tallies are not the reason.** Quiet has 19 exact or near values against native's 18, too close to decide on. The real reasons are the ones above.
- **"Adopt quiet" means quiet's structure on the kit's existing colour tokens.**
  - Quiet's 5 light shifts (`ok` ΔE 0.050, `ink2` 0.049, `muted` 0.046, `mintInk` 0.037, `mintBg` 0.024) are text tones. The kit's values are pinned to AA, so keep them.
  - Do **not** port quiet's dark values. 16 of them shift toward near-black, which breaks `theme.ts:4` ("never near-black") and the pin at `theme.brand.test.ts:19-28`.

### Ordered steps (incremental, one screen or one primitive per commit)

0. **Owner rulings first:** the dark ground, the font, and the logo tile.
   - Every board's dark page is near-black.
   - The boards use Cairo + Poppins; the app self-hosts Noto Sans Arabic.
   - The board tile is #fdfbf3/#fef8ef; `brandTile` is #064e3b (ΔE ≈ 0.61).
1. **Ground.**
   - Remove `bg-page` from `fw/features/shell/FamilyShell.tsx:15`, `fw/features/sign-in/LoginPage.tsx:16` and `fw/features/shell/WrongApp.tsx:12`, so the body shows `--margin` (`index.css:50,120`). That gives margin vs raised 1.08:1 (quiet's own is 1.07).
   - It is AA-safe on `--margin`: light ink3 6.57, lapis 5.07, ok 4.64, act 5.51, bad 5.99; dark 8.07 or higher.
   - In the same commit, make `AlertRow:39` read and unread differ by more than page vs raised.
2. **Dark-mode fixes:** the bell badge, and the selected edge and fill (priority actions 1 and 3).
3. **Card.**
   - Radius: use the existing `rounded-2xl`, which is already 16px because Tailwind's default was never reset. Do **not** add `--radius-xl: 16px`; that would silently move a live name from 12px to 16px.
   - Edge and depth: `border-rule` plus `--elev-page`, which has the same geometry and alpha as quiet's shadow.
   - API: `className` passthrough, because the padding varies.
   - **Location: not `wk/components/ui/layout/`.** That folder is at the 12-file cap, and `folder-cap.mjs --strict` (`ci.yml:361`) fails a 13th file. Create `wk/components/ui/surface/`; `ui/` has 4 subfolders, so there is room.
   - Convert the 15 rendered surfaces, and un-nest `LessonPanel:49` / `AudioPlayer:30`.
   - Portal edits also restyle staff-web (`GuardianHome.tsx:4`, `ChildView.tsx:7-9`) until the docs/51 §3 redirect (`family-host.ts:7-15`) ships.
4. **SectionHeader / MonthSection:** convert the 10 headings.
5. **Status:** give StatusChip a filled `pill` look (quiet `:300`) and replace the 8 pills with one NewMark.
6. **DateTile:** move `dayTile` (`family-mobile/src/lessons/lesson-text.ts:38`) into `client-core` and add a quiet 56×56 r12 bordered tile.
7. **Lesson rows** (72px):
   - The whole row becomes the link.
   - The filled per-row Buttons go (`HistoryRow:34`, `ReportRow:35`).
8. **Type and Button.**
   - The boards' 14px maps to `text-sm` (web sm is 15).
   - Quiet buttons are 12px radius at weight 700; the kit's are `rounded-md` 8px at 600. Change this once, in Button only.
9. **`PrepareCard:19`:** change `border-gold/40` to `border-rule`. This is a calm-look preference, not a rule fix: `index.css:83` forbids gold only on interactive elements and as text.
10. **Re-run this audit after each step.** The scores should fall monotonically.

Skipped under quiet: ListGroup, ListRow, separators and the segmented child-tab look. Add them only if the native board is chosen.

### Verdict on the cloud job's "scoped family theme" plan

**Do not merge `origin/feat/family-web-redesign` (`b72f464ad`) as it is.** Use the same token names, not a parallel system.

Why the branch is a parallel system:

| Problem | Evidence |
|---|---|
| A second token set | 26 `--fam-*` names, 2 fonts, and 11 new `@theme inline` entries; only 17 names are shared with `tokens.css` |
| A second variant axis | `@custom-variant family`; `button.tsx` gains `family:rounded-full family:font-bold` |
| Escapes | 49 arbitrary values in `family/*`, including the raw hex `border-[#d4a537]` and 4 `shadow-[…rgba]`; 12 `gradient(` |
| Duplicates | Pill, FamilyCard and Initial copy Button, the card recipe and Avatar. `pill.ts` uses `text-white`. `Initial` uses `text-2xl font-extrabold` (800 is not loaded). White on `--fam-tile-green` #10b981 is 2.54:1. |
| Layout clash | `PageBody` `max-w-[1120px] px-4 py-6` nests inside `FamilyShell:29` `max-w-[720px] px-4 py-5`: the 720 cap wins and the padding doubles |
| Wired live | `fb1559d09` sets `data-skin="family"` (`index.html:2`) and imports fonts (`main.tsx:3`). Merging swaps in the cream margin, Cairo/Poppins/Amiri and a 3px gold focus ring (#a47a12, 3.91:1) on every family screen, yet none of its components is imported anywhere. |
| Untested | `tokens.test.ts` and `theme.contrast.test.ts` read only the catalog palette |

**If a scope is needed at all.** Under quiet, light likely needs none, so the scope would hold only the owner's dark-ground and logo-tile rulings. Rules for it:

- Put it on `<html>` and reuse `data-skin="family"`, not a new attribute. Portals render outside any descendant scope: `dialog.tsx:90` and `Drawer.tsx:53` use `createPortal(…, document.body)`, and `draw.ts:55` reads `document.documentElement`. The body background (`index.css:120`) and `theme-color` must follow the scope too.
- Override the **raw** tokens (`--page`, `--margin`, …), not `--color-*`. The `@theme inline` utilities compile to `var(--page)`.
- Mirror the existing three blocks: light, the `prefers-color-scheme` media block, and `[data-theme=dark]`. Use selectors of specificity (0,2,0) or more, for example `[data-skin=family][data-theme=dark]`.
- Extend `tokens.test.ts` and `theme.contrast.test.ts` to the scoped values, and add the `theme-color`/manifest pair.

### Owner calls (open)

| Call | Options |
|---|---|
| Dark ground | Keep the soft green-grey `--margin` #1a211e, or relax `theme.ts:4` for a board's near-black |
| Font | Keep Noto Sans Arabic (400–700, self-hosted), or switch to Cairo + Poppins as on the boards |
| Logo tile | Keep `brandTile` #064e3b, or use the boards' light tile |
| Browser bar colour | Keep green #064E3B, or follow the page colour in light and dark |