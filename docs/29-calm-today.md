# 29 — Calm «اليوم» screen + floating glass tab bar (mobile)

Owner, 2026-10-26: «design a more clean calm landing screen» → approved («it doesnt have the floating
glass effect» → «like ios» → «go ahead»). Supersedes the Today part of docs/07 §12 (spine, now-line,
saffron start edge, per-card buttons) for the admin app. R-MOB-02, R-MOB-03, R-SCH-07, R-SCH-11 are
kept: every action is still there, now inside the lesson details sheet.

**Ships JS-only by OTA**: no native dependency, config plugin or `app.json` change (no `expo-blur` in
this APK). `tools/scripts/ci-checks/native-changes.mjs` must report no native change.

Phone 390×844, RTL, Noto Sans Arabic, palette tokens (`packages/shared/src/theme/theme.ts`). Light values
below; dark mode takes each token's dark twin.

## 1. Ground and header

- Screen ground `margin` (#f3f7f5). Header with today's top padding, 20 px sides.
- Greeting 14/22 `ink3`: «صباح الخير» before 12:00 Riyadh, «مساء الخير» from 12:00.
- Title «اليوم» 30/40 bold.
- Date line 13/20 `ink3`: «الإثنين 26 أكتوبر · بتوقيت الرياض» (+ the offline «آخر تحديث» as before).
- The bell: a 44 px circle on `raised` with a hairline shadow, at the end side.
- 18 px vertical rhythm between blocks.

## 2. Summary card

`raised`, radius 20, padding 14/8, hairline shadow. Three equal columns split by 1 px `rule`; count 22/28
bold tabular + label 12/18 `ink3`:

| Column | Counts | Look |
|---|---|---|
| «حلقة اليوم» | all shown lessons | ink |
| «تحتاج تأكيد» | `scheduled` | count in `act`, 7 px `act` dot |
| «انتهت» | `completed` | ink |

Each column is a button (44 px+) that filters the list; it replaces FilterPills. The active column gets a
`lapisWash` fill; tapping it again shows all.

## 3. Hero «الحلقة التالية»

`lapisWash`, radius 24, padding 18/18/16, gap 12.

- Line 1: «الحلقة التالية · بعد 12 دقيقة» 13/20 semibold `lapis` (no minutes from an hour away). A lesson
  under way reads «جارية الآن» and wins over the next one. The status chip at the end.
- Line 2: the Riyadh time 34/40 bold (`coverInk`) beside the students 18/28 bold and
  «مع أ. هدى · 45 دقيقة» 13/20 `ink2` (+ the student's own clock when not Riyadh).
- Two 46 px buttons, radius 14: primary `lapisFill` «تأكيد الحلقة» when confirm is allowed (else
  «ادخل الحلقة» inside the join window, else no primary) and a `raised` «التفاصيل» that opens the lesson
  details sheet.
- Replaces LiveSessions / NowLine on the admin Today; live info stays in the hero and the sheet.
- No hero → the quiet day (§6) when the day had lessons.

The lesson's subject («حفظ جديد», «مراجعة») is not on `LessonView` yet; the line omits it until it is.

## 4. «بقية اليوم · N»

15/24 bold + a «الكل» link at the end (resets the filter). Rows in ONE `raised` card (radius 20, 0/16
padding), each at least 62 px, 1 px `rule` between:

- time 15/22 semibold `ink2` tabular (46 px column);
- names 15/24 semibold + sub 12/18 `ink3` («أ. سلمى · 30 دقيقة», «تجريبية» / «تعويضية» in the sub);
- at the end a 7 px status dot + the status word 12/18 in the status tone.

A tap opens the lesson details sheet, where ALL of today's actions live: تأكيد / إلغاء / غيّر الموعد /
عدّل الوقت / تعويض / ادخل الحلقة, with R-MOB-03's optimistic behaviour. No spine, no per-row buttons, no
saffron start edges.

## 5. Ended lessons

Folded into one quiet row «انتهت N حلقات اليوم» + chevron; a tap expands them as compact rows (still a
tap → the sheet, which keeps «عدّل الوقت», R-SCH-11). The «انتهت» column opens the fold.

## 6. Quiet day and empty/error

Nothing left today: a centred 88 px `lapisWash` circle with a check, «انتهت حلقات اليوم» 20/32 bold,
«غدًا N حلقة، أولها الساعة 08:00.» 14/24 `ink3` (one GET /lessons/day for tomorrow with the existing
hook; no line while it loads or fails) and a `raised` «جدول الغد» → the schedule tab `?date=<tomorrow>`.
No lessons at all and the error state keep EmptyState / ErrorState.

## 7. Floating glass tab bar «like iOS»

Every tab layout on AppNativeTabs (admin, teacher, sales, assistant):

- A capsule 20 px from both sides and 24 px above the bottom safe area; 62 px high, radius 31, padding 4.
  Content scrolls under it (bottom inset = bar + gap, `useTabBarInset`).
- Light: fill `rgba(255,255,255,0.92)` (no blur in this APK: 0.8 let rows read through, 2026-10-26), a vertical white sheen (react-native-svg
  LinearGradient) 0.62 → 0.22 at 50 % → 0.36, a 0.5 px border `rgba(255,255,255,0.75)`, an outer hairline
  `rgba(23,32,28,0.08)` and the shadows `0 10 30 rgba(23,32,28,0.14)` + `0 2 6 rgba(23,32,28,0.06)`.
- Dark: fill `rgba(39,49,45,0.92)`, sheen 0.12 → 0.03 → 0.07, border `rgba(255,255,255,0.14)`, shadows
  `0 12 32 rgba(0,0,0,0.5)` + `0 2 8 rgba(0,0,0,0.3)`.
- Active tab: a 54 px capsule (radius 27) `rgba(120,120,128,0.14)` light / `rgba(255,255,255,0.12)` dark
  with a 0.5 px top highlight; icon + label `lapis`. Labels 11 px. The inbox badge stays.
- The values live in the shared `glass` tokens (`theme.glass.test.ts` checks them and the labels' AA).
- The bar is our JS bar on both platforms (expo-router JS tabs), so there is no system Liquid Glass bar
  to keep on iOS.
- **No dead strip** (owner memory 2026-10-24, react-native-screens #4132): only the capsule takes touches;
  the colour fade behind it is `pointerEvents: 'none'`. Role-hidden tabs stay off the bar, «المزيد»
  stays.

## 8. Accessibility and copy

Reduced motion respected (the pill jumps); RTL (`start`/`end` only); every button has a spoken name; 44 px
targets; MSA strings in `packages/shared/i18n/ar.json` with `en.json` parity (domain vocabulary kept).

## Next APK (TODO)

Add `expo-blur`: fill alpha 0.45 + `BlurView` intensity ~60 behind the capsule for a real iOS-like blur
on Android and iOS.
