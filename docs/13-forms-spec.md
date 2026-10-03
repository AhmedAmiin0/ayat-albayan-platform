# 13 — The three forms (owner spec, 2026-10-03)

Requirements R-FRM-01..03 (docs/03 §3.12). The text below is the owner's paste, verbatim, and is the authority for field titles, order, types, required flags and options. The app keeps three deliberate structured replacements (time from free slots, teacher from the DB, ids auto-filled from the link) but every title and option wording matches. **Owner, 2026-10-03:** the app renders these titles and options in clear Modern Standard Arabic (no Egyptian dialect), e.g. «عرفت عننا منين؟» → «كيف عرفت عنا؟», «المده» → «المدة»; the paste below stays as the historical record of the Google Forms.

## What the API and the DB do for it

| Spec | Where |
|---|---|
| Form 2 «البرنامج *» is an editable choice | `lesson_reports.program` (migration 167), prefilled from the student, `program` in the draft and submit commands, kept by `submit_report` v3 when left out, shown on the PDF |
| Form 2 headings and identity labels | `reports.done` / `detailTitle` / `notesTitle` / `studentId` in ar.json; the PDF reuses the form headings |
| Form 3 (built) | `lesson_feedback` (migration 166), `feedback.*` strings, `enums.feedbackKind` / `feedbackRecommend`, template `lesson_feedback_request` (status `not_submitted`, submitted to Meta only by the admin action), module `apps/api/src/modules/feedback` |

### Form 3 routes

| Route | Who | Notes |
|---|---|---|
| `POST /lessons/:id/feedback-request` `{studentId, resend?}` | admin | lesson completed or late; 409 `template_not_approved` / `lesson_not_eligible` / `already_submitted`; 503 `not_configured` without `FEEDBACK_TOKEN_SECRET`; queued through the inbox Outbox, dedup per lesson, student and link; never read from a job, so `auto_messages_enabled` is not involved |
| `GET /feedback` (teacher, kind, rating, from, to, page) | admin | rows with student, teacher, family phone |
| `GET /feedback/summary` | admin | per teacher: average, count, share who would recommend |
| `GET /teachers/me/feedback` | teacher | own rows (scope = the login) and own average; no family phone, no guardian |
| `GET /public/feedback/:token` | none | `{teacherName, kind, contactPhone, alreadySubmitted}` only |
| `POST /public/feedback/:token` `{rating, recommend, note?, contactPhone?}` | none | 404 `feedback_not_found` (wrong, tampered, replaced link), 410 `feedback_expired`, 409 `already_submitted`, 429 `too_many_requests` (10 per token and IP, 60 per IP, per 10 minutes, in memory) |

The link is `base64url(lessonId | studentId | exp) . HMAC-SHA256` (71 characters, 14 days). `lesson_feedback` stores only its sha256 (`token_hash`), so a resend revokes the old link. The link itself rides in the request message's `template_params.button` for the sender, and migration 168 keeps `lesson_feedback_request` messages out of the teacher's RLS read (a teacher could otherwise answer for the family). The server fills teacher and kind; the client never sends them.

## Additions beyond the Google Form (owner request 2026-10-03)

Two fields the Google Form never had, in clear Modern Standard Arabic. They are additions to the wizard, not changes to the form's own wording.

| Field | Type | Options / rule | API |
|---|---|---|---|
| نوع الحجز | one choice | حلقة تجريبية مجانية بس / اشتراك / حجز تعويضي (`kind`: trial / package / makeup) | `kind` on `POST /booking`; R-SCH-10 |
| الحلقة اللي الطالب فاتته (makeup only) | one choice | the student's missed lessons (`GET /booking/makeup-candidates?studentId`) | `makeupOfLessonId` |
| الفاتورة * (not for a trial) | image / PDF | upload from the device, or «من الشات» (the family's recent WhatsApp images / PDFs) | `invoice: {source: 'upload', path}` or `{source: 'whatsapp', messageId}`; R-PAY-03, R-MSG-06 |

DEVIATION from the form: in the wizard «الباقة المطلوبة» lists only the four paid sizes (4 / 8 / 12 / 16); the form's option «حلقة تجريبية مجانية بس» moved to «نوع الحجز» (a trial has no package and no invoice).

Errors with a string in `booking.error.*`: `invoice_required`, `invoice_type`, `invoice_too_large`, `invoice_path`, `invoice_message`, `media_expired`, `message_not_found`, `request_id_required`, `makeup_not_eligible`, `makeup_exists`, `makeup_student`, `makeup_scope_one`.

Tables and buckets (migrations 170-172): `invoices` (admin-only RLS, no teacher or guardian policy), private buckets `invoices` and `wa-media`, `lessons.makeup_of_id` (partial unique index: one active makeup per missed lesson; a one-lesson move keeps the tag), `create_booking` v3, balance views without makeups. Payouts count by lesson status only, so a completed makeup is paid like any completed lesson. The report PDF shows no package progress on a makeup (it has no package slot).

## Owner decisions flagged

1. «الساعه» and «تاريخ اول حصه» are applied literally (the app's own wording is «الساعة» and «تاريخ أول حلقة»).
2. The student name is optional on the Google Form; the app keeps it required.
3. The lesson-report required fields relax when the student was absent or excused (deliberate; the Google Form had no such case).
4. رابط الاجتماع stays read-only on the report (it lives on the lesson).
5. The PDF labels read «اسم الطالب» / «اسم المعلم» without «(لا تعدله)» (that hint is for the editing form); the student id is the line under the name.
6. The lead-qualification extras (level, memorized, goal, riwaya, …) stay in the lead panel.
7. Form 1 is spread over the booking wizard's steps (student → teacher → package → slot → review), each step in the form's own order; «عرفت عننا منين؟» sits with the contact details on the first step (a source belongs to the person, not to the booking), and the wizard's step names are short («الطالب، المعلم، الباقة، الميعاد، المراجعة»), the exact form wording being on the fields. Mobile follows the same split.
8. Form 3: «رقم واتساب للتواصل» is prefilled and editable (a corrected number is sent as E.164). «نوع الحلقة *» and «اسم المعلمة» are the lesson's own, so the family sees them as fixed lines (a one-line name, not a paragraph); the server sets kind and teacher and ignores anything the client sends for them.
9. The lead panel's «الأيام المتاحة» and «الساعه» are preferences (a from/to range, no star); the starred, single-time versions are the wizard's. A trial books one lesson, so the days picker is hidden there (the first lesson's weekday is the day).
10. The booking wizard needs a teacher and a free slot; a registration still waiting for a teacher («خيار فاضي») goes through «إضافة طالب» («لسه مفيش معلم»).
11. «تاريخ الحلقة *» and «رقم الحلقة *» on the report are lesson-derived and read-only (the number is computed per student). Say if a teacher must be able to correct the number.
12. The package labels follow the form everywhere (also subscriptions, exports, the dashboard): «حلقة تجريبية مجانية بس», «8 حلقات», «12 حلقة». Say if lists should keep the older «… في الشهر» wording and the form wording stay on the registration choice only.
13. «نوع الحجز» was read as three types (تجريبية / اشتراك / حجز تعويضي), because only «حجز تعويضي» was named. If a second new type was meant, say which.
14. The invoice is required for a makeup too (the literal reading of «not trial»). Say if a makeup should not need one: it is one line in the planner and the wizard.
15. Only a lesson the package already charged can be made up (a student's no-show, or an excuse that counted as a late cancel). A teacher or admin cancellation goes through «غيّر الميعاد». Say if those should also allow a free makeup.
16. The guardian's makeup confirmation reuses the approved booking templates («تم حجز حلقة تعويضية لـسهيلة — …»). Different wording needs a new Meta template and about a day of approval.
17. The invoice is proof on the booking; no payment row is created from it. Recording the payment stays «سجّل الدفعة». Say if the invoice should pre-fill the payment's receipt.
18. A WhatsApp file is fetchable for 29 days (Meta keeps a media id about 30). Older ones show as expired and the family is asked to send it again.
19. A completed makeup is paid to the teacher like any completed lesson. The missed original is paid only while «payout_count_no_show» is on: turning that on pays the teacher twice for one package unit. Say if the original should be left out of the payout once a non-cancelled makeup exists.
20. Mobile: the makeup wizard opens from a missed lesson's row under `(tabs)/students`; its «رجوع» is the app's usual ghost button in the header's trailing slot (like every pushed screen), and its fallback is the schedule. Check the back behaviour on a device.
21. Retention: invoice files that never reach a booking (a rejected or abandoned booking) and the `wa-media` copies of chat photos stay in their private buckets with no nightly clean-up yet (it needs the Storage API from a job runner, not SQL). Say how long guardians' photos may be kept.

---

## The owner's paste (verbatim)

1) استمارة تسجيل طالب جديد
الحقل    النوع    الخيارات
اسم الطالب    نص قصير
رقم الواتساب (مع كود الدولة) *    نص قصير
سن الطالب    نص قصير
النوع    اختيار واحد    ذكر / أنثى
الأيام المتاحة *    مربعات اختيار    السبت / الأحد / الاتنين / الثلاثاء / الأربعاء / الخميس / الجمعة
الساعه *    وقت
تاريخ اول حصه    تاريخ
المعلم/المعلمه    اختيار واحد    abrar / rabia / hassan / hend / reham / asmaa saeed / asmaa hussein / emad elsayed / shaimaa / samia elsayed / abdelrahman mostafa / (خيار فاضي)
المده    اختيار واحد    30 دقيقة / 45 دقيقة / 60 دقيقة / 90 دقيقة
الباقة المطلوبة *    اختيار واحد    حلقة تجريبية مجانية بس / 4 حلقات في الشهر / 8 حلقات / 12 حلقة / 16 حلقة في الشهر
عرفت عننا منين؟    اختيار واحد    إعلان فيسبوك / إعلان انستجرام / واتساب مباشر / صديق أو معرفة

2) تقرير الحلقة

بيانات الحلقة
الحقل    النوع    الخيارات
معرّف الطالب (لا تعدله) *    نص قصير    بيتعبّى تلقائيًا من الرابط
اسم المعلم (لا تعدله) *    نص قصير    بيتعبّى تلقائيًا
اسم الطالب (لا تعدله) *    نص قصير    بيتعبّى تلقائيًا
تاريخ الحلقة *    تاريخ
رقم الحلقة *    نص قصير
البرنامج *    اختيار واحد    القرآن الكريم / اللغة العربية / الدراسات الإسلامية
الحضور *    اختيار واحد    حضرت في الموعد / حضرت متأخرة / اعتذرت مسبقًا / غياب بدون إشعار
رابط الاجتماع    نص قصير

محتوى الحلقة
التسميع (المُسمَّع) *    فقرة
الحفظ الجديد *    فقرة
المراجعة *    فقرة
الدرس النظري / أحكام التجويد    فقرة

التقييم التفصيلي
تقييم البنود *    شبكة    الصفوف: التلاوة والنطق / الحفظ الجديد / المراجعة / التجويد / الاستيعاب والتفاعل / الالتزام والحضور — الأعمدة: ممتاز / جيد جدًا / جيد / مقبول / يحتاج إلى مراجعة
التقدير العام للحلقة *    اختيار واحد    ممتاز / جيد جدًا / جيد / مقبول / يحتاج إلى مراجعة

الملاحظات والواجب
ملاحظات المعلمة *    فقرة
الواجب المطلوب قبل الحلقة القادمة *    فقرة
خطة الحلقة القادمة    فقرة
المرفقات (اختياري)    رفع ملف

3) رأيك يهمّنا (فيدباك الطالب)
اسم المعلمة    فقرة    بيتعبّى تلقائيًا من الرابط
نوع الحلقة *    اختيار واحد    حلقة تجريبية مجانية / ضمن الاشتراك الشهري
تقييمك للحلقة *    مقياس 1–5    غير راضٍ ← راضٍ تمامًا
هل ترشّح الأكاديمية لصديق أو قريب؟ *    اختيار واحد    نعم / ربما / لا
ملاحظة أو اقتراح    فقرة
رقم واتساب للتواصل    نص قصير    بيتعبّى تلقائيًا من الرابط

(* = required)
