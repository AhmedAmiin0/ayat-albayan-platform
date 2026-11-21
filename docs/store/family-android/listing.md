# Google Play listing: «آيات البيان» (family app, com.ayatalbayan.family)

Default language **Arabic (ar)**, translation **English (en-US)**. Category **Education**. Free, no ads, no
in-app purchases. Counts below are Unicode characters as Play Console counts them (computed with
Python `len()` on 2026-11-21); limits: name 30, short description 80, full description 4000.

Nothing here claims a feature behind a switch that is off by default: the teacher chat
(`family_chat_enabled`, default false) and the in-app classroom (`family_meetings_in_app`, default
false) are not mentioned, nor recordings or lesson files (shown only when the academy shares them).
Update this text when those switches are on in production.

## App name

| Language | Text | Chars |
|---|---|---|
| ar | آيات البيان | 11 / 30 |
| en-US | Ayat Al-Bayan | 13 / 30 |

## Short description

| Language | Text | Chars |
|---|---|---|
| ar | تابِع حلقات القرآن ومواعيدها وتقاريرها مع أكاديمية آيات البيان. | 63 / 80 |
| en-US | Follow Quran lessons, schedules and reports with Ayat Al-Bayan academy. | 71 / 80 |

## Full description: Arabic (default), 1087 / 4000 characters

```text
تطبيق «آيات البيان» هو تطبيق الأسر والطلاب في أكاديمية آيات البيان لتعليم القرآن الكريم عن بُعد. يجمع لك حلقات الطالب ومواعيدها وتقاريرها في مكان واحد، لولي الأمر وللطالب نفسه.

ماذا يقدّم التطبيق؟
• الحلقة القادمة في الصفحة الرئيسية مع العدّ التنازلي، والدخول إليها بضغطة عند موعدها.
• جدول الحلقات بتوقيت منطقتك الزمنية.
• تأكيد الحلقة أو الاعتذار عنها أو طلب موعد آخر، مع ذكر السبب.
• تقارير الحلقات: التسميع والحفظ الجديد والمراجعة وملاحظات المعلم، مع ملف PDF.
• ما يحضّره الطالب للحلقة القادمة.
• الباقة: الحلقات المستخدمة منها وسجل المدفوعات.
• إشعارات قبل بدء الحلقة وعند وصول التقرير.
• لولي الأمر: كل أبنائه في حساب واحد، والتنقل بينهم بسهولة.
• للطالب: دخول خاص بكود الطالب وكلمة المرور.
• العربية والإنجليزية، والوضع الداكن، وفتح التطبيق بالبصمة.

الدخول
يدخل ولي الأمر برقم واتساب المسجّل لدى الأكاديمية ورمز يصله على واتساب، ويدخل الطالب بكوده وكلمة المرور التي تمنحها له الأكاديمية. التطبيق مخصّص لأسر الأكاديمية وطلابها المسجّلين.

خصوصية الأطفال
لا إعلانات في التطبيق، ولا تتبّع ولا معرّف إعلاني، ولا نبيع أي بيانات. سياسة الخصوصية: https://family.ayatalbayan.com/privacy
```

## Full description: English (en-US), 1351 / 4000 characters

```text
Ayat Al-Bayan is the app for families and students of Ayat Al-Bayan, an academy that teaches the Quran online. It brings a student's lessons, schedule and reports together in one place, for guardians and for students themselves.

What you can do
• See the next lesson on the home screen with a countdown, and join it with one tap when it starts.
• Browse the lesson schedule in your own time zone.
• Confirm a lesson, cancel it or ask for another time, with a reason.
• Read lesson reports: recitation, new memorization, revision and the teacher's notes, with a PDF.
• See what the student should prepare for the next lesson.
• Follow the package: lessons used and the payment history.
• Get notified before a lesson starts and when its report arrives.
• Guardians: all your children in one account, switch between them easily.
• Students: your own sign-in with your student code and password.
• Arabic and English, dark mode, and unlocking with your fingerprint.

Signing in
Guardians sign in with the WhatsApp number registered with the academy and a code sent on WhatsApp; students sign in with their code and the password the academy gives them. The app is for the academy's registered families and students.

Children's privacy
No ads, no tracking, no advertising ID, and we never sell data. Privacy policy: https://family.ayatalbayan.com/privacy
```

## What's new in 1.0.0

| Language | Text | Chars |
|---|---|---|
| ar | الإصدار الأول من تطبيق الأسر والطلاب: الحلقات والجدول والتقارير والباقة والإشعارات، بالعربية والإنجليزية. | 105 / 500 |
| en-US | The first release of the families and students app: lessons, schedule, reports, package and notifications, in Arabic and English. | 129 / 500 |

## Where each claim comes from

| Claim | Code |
|---|---|
| Next lesson, countdown, join | `apps/family-mobile/src/home/`, `packages/client-core/src/people/portal/countdown.ts`, `apps/family-mobile/src/lessons/use-join.ts` |
| Schedule in the viewer's time zone | `apps/family-mobile/app/(tabs)/schedule.tsx`, docs/34-timezones.md |
| Confirm, cancel with a reason, ask another time | `apps/family-mobile/src/lessons/options/`, `apps/api/src/modules/people/portal/actions/portal-actions.controller.ts` |
| Reports with PDF | `apps/family-mobile/src/report/`, `app/(tabs)/reports.tsx` |
| What to prepare | `apps/family-mobile/src/lessons/PrepareCard.tsx` |
| Package: lessons used, payments | `apps/family-mobile/src/package/UsedBar.tsx`, `PaymentsList.tsx` |
| Notifications | `packages/shared/src/notifications/catalogue/catalogue.family.ts` |
| Several children, switch | `apps/family-mobile/src/switch/`, `app/pick-child.tsx` |
| Student code + password | `apps/family-mobile/src/sign-in/`, `apps/api/src/modules/people/sign-in/` |
| Arabic/English, dark mode, biometric unlock | `apps/family-mobile/src/account/AccountSettings.tsx` |
| No ads, no tracking, no advertising ID | `apps/family-mobile/app-store.test.ts`, `app.json` blockedPermissions |

## Contact details on the listing

Play Console asks for a developer email (required) and website. Use the academy's support address that
is set in `academy_contact` on production (never written into this repo) and the site
`https://ayatalbayan.com`. Privacy policy URL: `https://family.ayatalbayan.com/privacy`.
