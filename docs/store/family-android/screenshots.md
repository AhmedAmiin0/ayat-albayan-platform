# Phone screenshots (Arabic default listing, then English)

Play needs 2-8 phone screenshots, 9:16 portrait, each side 320-3840 px (recommended **1080 × 1920**),
PNG or JPEG without alpha. Capture them from the production build signed in as the **test student**
(`app-access.md`), never a real family, in Arabic first, then the same set with the app in English.

| # | Screen | Route | What must be on it |
|---|---|---|---|
| 1 | Home | `app/(tabs)/index.tsx` | The next lesson card with its countdown and teacher, the «what to prepare» card |
| 2 | Schedule | `app/(tabs)/schedule.tsx` | A week with two or three lessons, one confirmed |
| 3 | Lesson | `app/lesson/[id].tsx` | Status chip and the actions (confirm / cancel / ask for another time) |
| 4 | Reports | `app/(tabs)/reports.tsx` then `app/report/[id].tsx` | A report: recitation, new memorization, revision, the teacher's note |
| 5 | Package | `app/package/[id].tsx` | Lessons used bar and one payment |
| 6 | Account | `app/(tabs)/account.tsx` | Settings and the two rows «سياسة الخصوصية» / «حذف الحساب وبياناته» |

Rules:

- Do not show chat or the in-app classroom while they are off in production (the listing does not
  claim them).
- No real names, phone numbers or emails: test records only; the status bar clean (full battery, no
  notifications).
- Light theme for the set; optional dark-theme duplicates are allowed but count towards the 8.
- Capture on an emulator at 1080 × 1920 (Pixel 4-class, 420 dpi) with
  `adb exec-out screencap -p > 01-home.png`, then save under `docs/store/family-android/screenshots/`
  (`ar/` and `en/`) if they are to be kept in the repo.
