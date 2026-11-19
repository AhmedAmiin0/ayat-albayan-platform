# Design review: family web features (#776)

Review date 2026-11-19, on `feat/family-web-features` at 758fccb5d. It covers the family live
room, lesson files and recordings, the shared chat, /profile, /package, and the issues left open
by #775.

**Method.** The family-web and staff-web dev servers ran against a faked API (Playwright route
stubs with sample data only). Each screen was shot at 390 and 1280, in light and dark, in Arabic
and English. The room was mounted through `ClassroomRoom` with a fake `RoomClient` on a temporary
harness page; that page was not committed. Chromium ran with a fake camera and microphone. Each
shot was audited in the page itself:

- text contrast, computed from the rendered colours
- tap targets under 44 px
- icon buttons without a name
- sideways overflow
- raw i18n keys

The screens were compared with the `FamRoom*`, `FamFiles*`, `FamChat*`, `FamRec*` and
`StaffWeb{Home,Account,Package}` boards. Reduced motion was checked with
`reducedMotion: 'reduce'` (`document.getAnimations()` is empty).

## Findings

| # | Sev | Screen | Finding | Status |
|---|-----|--------|---------|--------|
| 1 | high | Lesson page `/lesson/<id>`, 1280 | Two columns at a 44rem column: the files card and its audio player overflowed onto the recording card | fixed (two columns from @3xl) |
| 2 | high | Room «المحادثة» panel (web panel and phone sheet) | The composer sat below the panel's fold, so a reply needed a scroll first | fixed (`--chat-end-gap` on the room chat scroller) |
| 3 | medium | Child tabs «المحادثة» unread badge (staff tabs too) | `text-on-lapis` is not a generated class: dark ink on green, contrast 2.15:1 | fixed (`text-primary-foreground`, AA) |
| 4 | medium | `Dialog layout="sheet"` ≥ 640px («تغادر الحلقة؟», country picker) | The card was pushed to the inline end (left edge at 1280) | fixed (`sm:justify-center`) |
| 5 | medium | Home next lesson + lessons list | Countdown «يُتاح الدخول بعد …» and hint «يُتاح الدخول من …» said the same thing twice | fixed (`LessonAction counted`) |
| 6 | medium | Report / lesson / recordings pages | The back button said «العودة إلى الحلقات», but it goes back in history (opened from reports, alerts, home) | fixed («رجوع» + chevron; staff keeps its words) |
| 7 | medium | Bell (every family page) | The unread badge covered the bell glyph | fixed (badge on the button's corner) |
| 8 | low | Lesson page, 390 | 2 px sideways scroll (grid track at min-content) | fixed (`grid-cols-1`) |
| 9 | low | «ما المطلوب للحلقة القادمة», English page | Arabic homework set LTR (punctuation on the wrong side) | fixed (`dir="auto"`) |
| 10 | low | English pages | An Arabic teacher name inside an English sentence is not bidi-isolated («Teacher :أ. مريم») | open (`teacherLabel` feeds selects and filters across staff-web too; needs FSI/PDI per call site) |
| 11 | medium | Device check (FamRoomWebCheck) | No microphone level meter («نسمعك الآن»), no «اختبر الصوت», no «المعلم/ة في الغرفة الآن» card | open (feature gap, not a defect) |
| 12 | low | Room, phone sheet | The chat/people tabs scroll away with the thread (stick-to-end scrolls the sheet body) | open |
| 13 | low | Room chat button | The unread badge stays while the panel is open | open |
| 14 | low | Chat, file message whose `url` is null | Renders an empty bubble (time only) | open (API signs every file today) |
| 15 | low | /profile, /package back links | No chevron, unlike the other back buttons | open |
| 16 | info | Chat at 390 in the harness | The composer can end under the tab bar after a late media layout shift. Not reproduced with valid media | open (verify on a device) |
| 17 | pass | Known #775 issue: week arrows («الجدول»), «حسابي» rows | Chevrons point the reading direction in ar and en (checked from computed `scale`) | no change needed |

**Other checks.**

- Text contrast is at least 4.5:1 on every new screen, in light and dark, after fix 3.
- No targets under 44 px at 390. At 1280 the 32 px `size="sm"` buttons are the design system's
  desktop size.
- Every icon button has a name.
- No raw i18n keys.
- English strings exist for every new screen.
- The Arabic copy is Modern Standard Arabic.

**Motion.** The audit found only purposeful motion:

- panel and sheet fade or rise
- `animate-pop-in` on a new badge or button
- the speaking ring (`.ab-ring`, an outline transition)
- the recording, live and playing dots: `animate-pulse`, the only loops, all live indicators
- player progress
- `.ab-press`

All of it uses the motion tokens. Under reduced motion, index.css stops every animation and
transition, and the `.ab-press` transform applies only under `no-preference`. No new motion was
added in this review.

## Screenshots

`before-*` / `after-*` show the same view before and after the fixes. The `after-*` files with no
matching `before-*` are spot checks of other screens.
