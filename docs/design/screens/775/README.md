# #775 screenshots: family web portal + the staff screens it touches

This is the montage set: 13 composed PNGs, each showing all variants or before|after side by side. The individual captures one folder up came from a parallel run.

Rendered 2026-11-19 from the Vite dev servers with **no backend**. Every API and Supabase call was
answered by Playwright route fakes, and every other request was blocked. LiveKit was never contacted.
The clock was fixed at 2026-11-19 15:00 Asia/Riyadh. Captures are at deviceScaleFactor 1 and
quantized to 256 colours.

**All data is fake sample data:** the student «يوسف أحمد» (AB-9907), his sister «مريم أحمد»
(AB-9908), the guardian «خالد» (+966500000000), the teacher «أ. فاطمة», and made-up lessons,
reports and alerts.

## Family web (this branch). Each file shows 1280 light | 1280 dark | 390 light | 390 dark

| File | Page |
|---|---|
| family-01-login.png | /login, signed out (WhatsApp code way) |
| family-02-children.png | /children «اختر الطالب»: a guardian with 2 children and no pick saved yet |
| family-03-home.png | /portal: the guardian with يوسف picked (next lesson, tabs, «ما المطلوب», upcoming lessons) |
| family-04-schedule.png | /schedule: this week |
| family-05-reports.png | /reports |
| family-06-report.png | /report/$reportId: one sent report (the PDF is still being prepared) |
| family-07-alerts.png | /alerts: 2 unread and 2 read |
| family-08-account.png | /account: the guardian, the children, settings |

## Staff web: BEFORE (origin/develop 35fb46a2, the merge-base) next to AFTER (#775)

The same fakes were used on both sides. The pixel diff was ImageMagick `compare -metric AE -fuzz 1%`.

| File | Screen | Pixels changed |
|---|---|---|
| staff-11-staff-login.png | /login, 1280 + 390 (LanguageSwitch, Button) | 0 |
| staff-12-radiochips-booking.png | /admin/book step 1 «نوع الحجز», with «اشتراك» selected (RadioChips), 1280 light, 1280 dark, 390 | 270 / 514 / 380: **only the selected chip** (lapis edge + inset ring) |
| staff-13-slotgrid-booking.png | /admin/book slot step, with 5:45 picked (SlotGrid) | 0 |
| staff-14-teacher-messages.png | /teacher/messages «رسائل الطلاب» (ChannelThread), 1280 + 390 | 0 |
| staff-15-teacher-room.png | /classroom/$lessonId, teacher room while connecting (LiveKit socket held, never reached) | 0 |
