# #775 screenshots (2026-11-19)

The family portal (`apps/family-web`) as built on `feat/family-web-features`, and four staff
screens that use the shared pieces #775 changed (RadioChips' selected state, Button,
LanguageSwitch). Vite dev servers, with a fake API and a fake Supabase session in Playwright;
viewport only, deviceScaleFactor 1, `Asia/Riyadh`. The data is example data only: guardian
«سارة أحمد» (+966500000000), children «يوسف» and «ليلى», teacher «أ. مريم خالد».

## Family portal (guardian of two children, «يوسف» picked)

| Page | 1280 light | 390 light | Dark |
| --- | --- | --- | --- |
| Sign-in `/login` (signed out) | family-login-1280-light | family-login-390-light | |
| «اختر الطالب» `/children` | family-children-1280-light | family-children-390-light | |
| Home `/portal` | family-home-1280-light | family-home-390-light | family-home-1280-dark, family-home-390-dark |
| «الجدول» `/schedule` | family-schedule-1280-light | family-schedule-390-light | family-schedule-1280-dark, family-schedule-390-dark |
| «التقارير» `/reports` | family-reports-1280-light | family-reports-390-light | |
| One report `/report/r1` | family-report-1280-light | family-report-390-light | |
| «الإشعارات» `/alerts` | family-alerts-1280-light | family-alerts-390-light | |
| «حسابي» `/account` | family-account-1280-light | family-account-390-light | |

## Staff (teacher login, 1280 light)

- `staff-login-1280-light.png`: the staff sign-in (LanguageSwitch, Button).
- `staff-teacher-home-1280-light.png`: «اليوم» (Buttons).
- `staff-teacher-messages-1280-light.png`: «رسائل الطلاب», the chat with يوسف's family open.
- `staff-teacher-report-1280-light.png`: «تقرير الحلقة», RadioChips with البرنامج and الحضور picked.
- `staff-teacher-report-grades-1280-light.png`: the same form scrolled to the grade chips.

All files are `.png` (25 in all). They are not compressed because no PNG quantiser was available.
