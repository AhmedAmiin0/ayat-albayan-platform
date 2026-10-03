# 13 — The three forms (owner spec, 2026-10-03)

Requirements R-FRM-01..03 (docs/03 §3.12). The text below is the owner's paste, verbatim, and is the authority for field titles, order, types, required flags and options. The app keeps three deliberate structured replacements (time from free slots, teacher from the DB, ids auto-filled from the link) but every title and option wording matches.

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
