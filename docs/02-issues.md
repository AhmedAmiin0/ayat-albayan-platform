# 02 — Issues found in the current system

Each issue has evidence from the actual data and the requirement ID that fixes it (see `03-requirements.md`).

## A. Data integrity

| ID | Issue | Evidence | Fixes |
|----|-------|----------|-------|
| A1 | No single source of truth for a student. The same person exists in «ردود التسجيل», «الطلاب», «تقويم الحجوزات», «كل المحادثات», «سجل الطلاب المشتركين», «Heart › subscription», ~60 per-student sheets, and the income statement. | «سهيلة» appears as سهيلة / سهيله / سهيلة وجودى / سهيله وجود / جود وسهيله / أم جودى وسهيله (6 rows, 6 folders). «ام ايمان» vs «الأستاذة : ام ايمان» (2 rows). «فاطمه», «فاطمة», «فاطمة محمد», «فاطمه محمد خان». | R-STU-01, R-STU-03 |
| A2 | Student ID (`AB-nnnn`) is not propagated. Report form asks the teacher to type it; it is empty in all 60 reports. Column `معرّف الطالب` in «تقويم الحجوزات» mostly empty. | «سجل تقارير الحلقات» col Y empty for all rows; «الطلاب» tab rows AB-0001..: age/gender/country/level all blank. | R-REP-01, R-STU-02 |
| A3 | Teacher identity is free text. | Same teacher stored as "أبرار", "أبرار عاطف", "ابرار عاطف", "أبرار عاطف قاسم", "Abrar", "ابرار". In «سجل الطلاب المشتركين» the *teacher* column contains "الفيوم" and "مصر" (cities) and "الأستاذة : هند", "المعلمة: هند", "معلمه هند". 38 of 60 students have no teacher at all. | R-TCH-01, R-REP-01 |
| A4 | Two or more students share one phone/row. Siblings are registered as one student, so attendance, reports and package counts are wrong for each child. | «سهيلة وجودى» = 2 girls, `عدد الطلاب = 2`; «Heart» lists Souhaila and judy separately but one booking row. | R-STU-04 |
| A5 | Lesson numbering is free text and inconsistent. | "الثانيه", "الثالثه", "الخامسه" (twice), "التاسعه" (twice), "Laborum Recusandae". | R-LES-03 |
| A6 | Bad dates & test data mixed with production data. | Report rows with date 8/11/2066, 9/30/1996, 8/24/2066; «سجل الطلاب المشتركين» has first lesson 2029-05-29; Lorem-ipsum rows ("Minus ipsum est rep"); "تجربة النظام TEST", "اختبار الرحلة", "test", "نمنم". | R-NFR-04 |
| A7 | Duplicate report submissions create duplicate PDFs and inflate lesson counts. | جودى 8/19 submitted at 19:39 and 21:53 (identical); ام ايمان 2026-09-18 "الخامسه" twice; «سجل الطلاب المشتركين» counts 9 lessons for ام ايمان but the attendance sheet shows 9 rows with 2 duplicates. | R-REP-04 |
| A8 | Phone numbers in 4 formats. | `966598917071`, `+966 56 736 1548`, `966 59 545 3356`, `@DenaT106` (Telegram handle in phone column), `1147189122` (missing country code). | R-STU-02 |
| A9 | The registration form changed shape several times; the response sheet has orphan columns. | Headers: `Column 19` ×3, `Column 20…23`, `وقت البدء` ×2, `المده` ×2, `عرفت عننا منين؟` ×2. Old questions (level, memorized, goal, riwaya, country, guardian) were deleted so new students have no placement data. | R-STU-02, R-LEAD-03 |

## B. Scheduling & calendar

| ID | Issue | Evidence | Fixes |
|----|-------|----------|-------|
| B1 | Duplicate recurring series for the same student. Every re-sync creates a new series instead of updating. | Abrar's calendar 2026-09-26: «مرام يحي» has 5 series (08:00 ×4 + 10:00 ×1); «نمنم» has 7 identical series at 07:00; «صباح حبيب» 4 series across two different day-sets (Sun/Tue vs Sun/Thu). | R-SCH-02, R-SCH-05 |
| B2 | Status never leaves «يحتاج تأكيد». Confirmed, active, paying students still show as needing confirmation. | 29 of the 30 events listed 2026-09-28→30 on the main calendar are "(يحتاج تأكيد)" incl. ام ايمان (9 lessons done, paid); the only exception is تولين (status مشترك). | R-SCH-03 |
| B3 | No conflict detection. Overlaps are only caught by a human writing "⚠ بتتقاطع". | Notes "⚠ بتتقاطع مع حلقة عيون بيرود 5 عصرًا"; Abrar 2026-09-24 has 08:00 and 10:00 series for one student. | R-SCH-04 |
| B4 | Teacher availability is not modelled. | «المعلمين › الأيام المتاحة» empty for all 11 teachers; assignment done by memory. | R-TCH-02 |
| B5 | Recurrence end date computed from "lessons/month" assumes no absences; package end is wrong after the first cancellation. | "16 حلقة في الشهر … حتى 2026-10-06" fixed on creation. | R-SUB-03 |
| B6 | Time-zone ambiguity. Leads write "الساعة 7 من غير ص/م"; form has a free "الساعه" field; student time zone was removed from the form. | Notes "«الساعة 9» من غير ص/م"; Suleiman (Finland) row "ناقص تاريخ أو وقت". | R-SCH-01 |
| B7 | Calendar events say "edit in the sheet, not here" — teachers cannot act on their own schedule. | Event description text. | R-TCH-03 |
| B8 | Location/link inconsistent: "أونلاين — Zoom" vs Meet link; attendance logs show Zoom, Meet and Jitsi links for the same student. | ام ايمان: us06web.zoom.us, meet.google.com, us05web.zoom.us across 9 lessons. | R-LES-02 |

## C. Communication (WhatsApp)

| ID | Issue | Evidence | Fixes |
|----|-------|----------|-------|
| C1 | Automatic reminders have never worked. | 636 rows in «سجل التذكيرات», all `404 (#132001) Template name does not exist in the translation` for `lesson_reminder_v…` and `booking_confirmat…`. | R-MSG-01, R-MSG-02 |
| C2 | Every confirmation, link, PDF and payment reminder is sent by hand. | «لينكات الحلقات» and «الردود الجاهزة» rely on `ابعت ↗` buttons; `اتبعت؟` never recorded. | R-MSG-03 |
| C3 | Conversation history lives in a human-written summary column; no inbound message log. | «كل المحادثات › Summary». | R-LEAD-02 |
| C4 | Job applicants (29) and group chats (11) pollute the lead pipeline and dashboard. | Status values "توظيف / عرض خدمة", "جروب حلقة". | R-LEAD-04 |
| C5 | 38 % of leads are "interested, no time" with no SLA or automatic follow-up. | 41 / 107. | R-LEAD-05 |

## D. Reports

| ID | Issue | Evidence | Fixes |
|----|-------|----------|-------|
| D1 | Teacher re-types identifiers → wrong linking → PDFs land in the wrong/new folder. | "حالة الربط" column exists because linking fails. | R-REP-01 |
| D2 | One Google Sheet + one Drive folder per student (60 and growing) — unmanageable, no cross-student query. | 60 «سجل حضور — X» files. | R-REP-05 |
| D3 | Report is a Google-Form; no draft, no edit after submit, no validation (future dates accepted). | Dates in 2066. | R-REP-02 |
| D4 | Parent only receives the PDF if admin forwards it. | Manual step 3.4. | R-REP-03 |

## E. Subscriptions & finance

| ID | Issue | Evidence | Fixes |
|----|-------|----------|-------|
| E1 | Remaining lessons counted by hand; no link between a completed report and the package balance. | «Heart › subscription» Lectures / Sub typed manually; Tolin "8 used, 0 remaining, Not paid" still has active calendar events. | R-SUB-01, R-SUB-02 |
| E2 | No payment record (date, amount, method). Only Paid / Not paid. | «Heart › subscription». | R-PAY-01 |
| E3 | Teacher payout computed by hand per student per month. | Income statement "Staff Expenses" column per student. | R-PAY-02 |
| E4 | Lead source → revenue attribution impossible (ads are 53 % of spend). | Aug ads 17,000 EGP of 31,810 total. | R-RPT-02 |

## F. Operations / security

| ID | Issue | Evidence | Fixes |
|----|-------|----------|-------|
| F1 | Everything runs on one personal Gmail account; teachers have no login; all 11 teacher calendars have no Google email attached. | «المعلمون › إيميل جوجل» empty. | R-AUTH-01 |
| F2 | A doc named «Backup keys» sits in Drive root; API keys for WhatsApp live in Apps Script properties. | Drive listing. | R-NFR-02 |
| F3 | Dashboard numbers are formulas over inconsistent statuses — "طلاب حاليين 22" vs 60 students with reports vs 9 paying. | «لوحة الملخص». | R-RPT-01 |
| F4 | Admin does ~12 manual steps per student per month; the system does not scale past one person. | Flow §3. | all |
