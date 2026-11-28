# 65 · Admin and teacher walkthrough fixes

Source: a manual walkthrough of the live staff web app on 2026-11-26 (admin role, then a teacher), English, dark theme, 1408×885. Everything under «Seen» was seen in the browser; none of it was checked against the code. Arabic and RTL, the light theme, phone widths, modals and the family roles were not reviewed.

This doc is the work list. Names, student codes, phone numbers and money figures from the walkthrough are left out on purpose: the repository is public. No PR, commit or comment adds them back.

## Rules for every PR

1. Find the code by route and by the visible text quoted here. Confirm the cause in code before changing anything. An item that turns out to be intended behaviour is not changed: its row in «Status» says why.
2. A UI item (U-lane) is fixed directly. Every layout fix is checked in both directions (Arabic RTL, English LTR) and both themes, and its PR body says how.
3. A data item (D-lane): fix the logic or the query that makes the wrong number, test first. Never edit, merge or delete records. Where the records themselves look wrong, the PR adds no data change: it puts a read-only query in its body under «Rows to report» and the item waits for the owner.
4. One commit per item id inside a PR, so each can be reviewed alone. The PR body lists «item → commit → test».
5. A fix that needs a shared schema, a controller or a client-core endpoint file while a docs/62 contracts PR is open is left out and listed under «Needs the contracts lane».
6. Each PR updates its rows in «Status» at the end of this doc.

## Order

The contracts and schemas lane (docs/62) and the component folders lane (docs/63) go first (owner, 2026-11-26). This list is worked by one builder behind them: one open PR at a time, and it opens or pushes to a PR only while no PR of those two lanes has a check queued or running.

The order is U1, U2, then D1 to D10 (numbers and rules before polish), then U3 to U11.

### U-lane: screens (staff-web)

| # | Branch | Title | Items |
|---|---|---|---|
| U1 | `fix/ux-contained-layout` | `fix(staff-web): fit the sidebar footer, the chat composer and cut-off labels` | UX-4, UX-5, UX-6 |
| U2 | `fix/ux-payment-actions` | `fix(staff-web): put payment row actions in one menu with a delete confirmation` | UX-7 |
| U3 | `fix/ux-one-scroll` | `fix(staff-web): scroll each page once and keep table headers in view` | UX-3, T-UX-3 |
| U4 | `fix/ux-dashboard` | `fix(staff-web): show each dashboard fact once and one lesson action` | UX-8 |
| U5 | `fix/ux-page-chrome` | `fix(staff-web): page titles, breadcrumbs, nav names, steady badges and the splash language` | UX-2, UX-9, T-UX-4 |
| U6 | `fix/ux-leads-messages` | `fix(staff-web): steady lead rows, tags in the page language and readable template text` | UX-10, UX-11 |
| U7 | `fix/ux-people-pages` | `fix(staff-web): one name rule, labelled row actions and a calmer student header` | UX-12, UX-13 |
| U8 | `fix/ux-schedule-finance` | `fix(staff-web): label the schedule load bar and write finance figures one way` | UX-14, UX-15, T-UX-5 |
| U9 | `fix/ux-teacher-pages` | `fix(staff-web): name the time zone and tidy the teacher pages` | T-UX-1, T-UX-2, T-UX-6, T-UX-7, T-UX-8, T-UX-9 |
| U10 | `fix/ux-type-scale` | `fix(staff-web): one type scale and full-size targets on the dashboard` | UX-16 |
| U11 | `docs/admin-load-findings` | `docs(repo): what makes the admin pages slow to load` | UX-1 (findings only; fixes wait for the owner) |

### D-lane: numbers and rules (api first, then the screens that show them)

| # | Branch | Title | Items |
|---|---|---|---|
| D1 | `fix/finance-margin-rounding` | `fix(api): round the finance margin once, at the end` | DATA-10 |
| D2 | `fix/dashboard-counts` | `fix(repo): make the dashboard counts match the lists they open` | DATA-4 |
| D3 | `fix/lesson-final-status` | `fix(api): give every past lesson a final status` | DATA-3, T-DATA-4 |
| D4 | `fix/lesson-balance` | `fix(api): never show more lessons left than the package holds` | DATA-2 |
| D5 | `fix/report-rules` | `fix(repo): one time, one count and one rule for lesson reports` | T-DATA-1, T-DATA-2, T-DATA-5, T-DATA-6, T-DATA-9 |
| D6 | `fix/finance-teacher-cost` | `fix(repo): name the teacher cost in finance for what it is` | DATA-1 |
| D7 | `fix/student-status-tabs` | `fix(repo): make the student tabs add up to the total` | DATA-7, T-DATA-3 |
| D8 | `fix/schedule-sets` | `fix(repo): count the same lessons on the admin and teacher schedules` | T-DATA-7, T-DATA-8 |
| D9 | `fix/test-records-out` | `fix(api): keep test records out of dashboard and finance totals` | DATA-6 |
| D10 | `fix/name-and-date-fallbacks` | `fix(repo): a fallback for empty guardian names and the real application date` | DATA-8, DATA-9 |

Report only, no PR: DATA-5 and DATA-11 (the queries ran read-only on 2026-11-27 and the rows went to the owner; see «What the read-only reports showed»). DATA-12 is fixed in its own PR (`fix/users-role-record`).

## Owner decisions, with the default each PR takes until he says otherwise

| Item | Question | Default |
|---|---|---|
| DATA-1 | Is the finance margin accrual (what teachers earned) or cash (what was paid out)? | Accrual stays in the margin. The line is renamed to say «earned», the amount paid shows beside it, and both pages use the same month rule. |
| DATA-2 | What does a full refund do to the subscription's status? | No automatic status change (refund effects are chosen per case). The fix is the lesson balance and showing «refunded» beside the paid state. |
| DATA-5 | Should saving a second open package with the same terms for one student ask first? | No new rule. The rows are reported; a duplicate is closed in the app with «cancel duplicate». |
| DATA-6 | Which records are tests? | Only records already carrying the test flag are left out of totals. The PR reports rows that look like tests; flagging them is the owner's action in the app. |
| DATA-11 | May lessons be used before a package is paid? | No rule changes. The rows are reported. |
| T-DATA-5 | Does an absent lesson need a report? | Follow the rule the code and docs already state; if they disagree, report it and change nothing. |
| T-DATA-8 | Which lessons does a schedule's count include? | Live lessons only (not cancelled, not moved away), on both views, with the count labelled. |
| UX-12 | Which name shows for a teacher? | The name in the page language, with the other one as the fallback, everywhere. |

## U-lane items

### U1

**UX-4 Sidebar footer overflow.** Seen: the theme switch (Auto, Light, Dark) and the time-format switch (Auto, 12-hour, 24-hour) each sit in a horizontally scrolling box narrower than its content, so a scrollbar shows and «24-hour» is cut. The fixed footer covers the Finance links until the nav is scrolled, and on deep pages the nav scrolls on its own so the logo leaves the view. Done when: both switches fit without scrolling and every nav item is reachable without the footer covering it (for example by moving the switches into the account menu).

**UX-5 Message composer is crushed.** Seen on `/admin/inbox?phone=…`: with the list, the thread and the subscription panel side by side, the message box is about 140 px wide and its placeholder wraps to five lines; the thread column is about 350 px. Done when: the composer spans the thread column, the thread has a sensible minimum width, and the right panel narrows or folds first.

**UX-6 Cut-off primary content.** Seen: schedule cards cut student names and statuses («Absent with…», «Needs confi…») and the last day column is clipped at the edge; a lead status badge reads «Trial lesson boo…»; the students table's «Note» column is cut at the edge; the messages search box shows «Search b». Done when: these read in full at 1408 px wide, or carry a tooltip or an expand where space is truly short.

### U2

**UX-7 Destructive actions on Payments.** Seen: every row shows a red «Delete» button beside «Edit»; bank-transfer rows also stack «View attachments», «Edit amount» and «Edit», so row heights differ. Done when: row actions live in one menu, delete asks for confirmation, and «Edit» and «Edit amount» are merged or clearly told apart.

### U3

**UX-3 Nested scroll containers.** Seen on `/admin`: the sidebar scrolls, the main card scrolls, and «Today's lessons» is a fixed-height scrolling list inside it; list pages add a fourth scroller around the table. Done when: each page has one vertical scroll for its content, table headers stay in view, and inner lists do not trap the wheel.

**T-UX-3 Inner scroll card (teacher pages).** Seen: every teacher page puts its content in a fixed-height card with its own scrollbar while the page does not scroll; on the report form the submit buttons are below the fold inside that card. Same fix as UX-3.

### U4

**UX-8 Dashboard.** Seen: «Needs confirmation» and «Packages needing payment or renewal» appear twice (cards and the work panel); the fourth card is taller because its label wraps; each lesson shows a disabled «Join the lesson» above an active «Open the room now» (show the one that applies); the latest messages list shows a raw template name («You: Template: …»).

### U5

**UX-2 Splash screen ignores the page language.** Seen: with the page in English, the splash is in Arabic and its ellipsis lands on the wrong side. Done when: the splash follows the stored language and direction.

**UX-9 Navigation and page chrome.** Seen: the nav calls the admin feedback page «Your opinion matters» («Feedback» is clearer); nav and breadcrumb say «New leads» while the page heading says «All conversations»; Messages and Online classrooms share one icon; the browser tab title is the same on every page; six pages have no breadcrumb (classrooms, finance, invoices, feedback, short links, receivables); the sidebar count badges and the bell badge vanish while a page loads and come back; the bell shows «9+» while its label announces thousands unread (add «mark all read» or cap sensibly).

**T-UX-4 Teacher header.** Seen: the theme switch takes permanent room in the header (move it into the account menu); the bell shows «9+» for a count in the twenties; the tab title is the same on every page.

### U6

**UX-10 Leads.** Seen: «WhatsApp direct» and the relative time change position from row to row; the status filter list has no counts; the default order is not by recency and there is no visible sort control.

**UX-11 Messages.** Seen: tag chips are Arabic in the English page and sit in a horizontally scrolling strip; the empty state leaves most of the screen unused; template messages show raw placeholders such as `*{{1}}*`.

### U7

**UX-12 Students and Teachers.** Seen: teacher names are Arabic in tables but English on the dashboard and the schedule (see «Owner decisions»); row icon buttons on Students have no visible label or tooltip; «Max students» is blank for most teachers (show «No limit»).

**UX-13 Student profile.** Seen: eight header buttons of equal weight; «Course and package» and «Lesson balance» repeat the same facts; «Cancel subscription» sits beside routine actions.

### U8

**UX-14 Schedule.** Seen: the bar with a number under each teacher has no label; «your time» should name the time zone.

**UX-15 Finance pages.** Seen: one total shows decimals and the next does not; the finance summary lists several all-zero months before the first real one; the receivables column «Days overdue» reads «31 days ago»; feedback scores read «3.3  5 of 5» (use «3.3 / 5»).

**T-UX-5 Teacher schedule.** Seen: a «Teacher» column shows only the teacher's own name and takes room the day columns need; names and statuses are cut; moved and cancelled entries weigh the same as live lessons, and the lesson count includes them (the count rule is T-DATA-8).

### U9

**T-UX-1 Lesson times have no time zone label.** Seen: the header shows two clocks with the academy's zone first; the «Next lesson» card gives a time in the teacher's zone, which beside the other clock looks as if the lesson has passed; the schedule says only «your time». Done when: the teacher's own zone leads the header, and a lesson time names its zone wherever a second zone is on screen. The time itself comes from the server and is formatted with the shared formatters (rule 22).

**T-UX-2 Today page.** Seen: the same confirmation appears twice (an alert with «Open lesson» and the «Next lesson» card with «I will attend»); notification alerts are Arabic in the English page and use 24-hour time and Arabic dates while the rest is 12-hour English; alerts list one «Write the report» item while the student's file shows several reports waiting; «1 lesson ended today» is plain text with no way to see which lesson.

**T-UX-6 Available times.** Seen: the page title and the section title are the same words; all seven days are the same with no «copy to all days»; the × and + buttons have no labels or tooltips; the save button is below the fold; the timeline starts at 08:00 (check what happens to availability before it).

**T-UX-7 Students list.** Seen: tabs are ordered Subscribed, Trial, All with All selected (the admin list puts All first); «Last lesson: None» and «Attendance 0%» after one absence read harshly (use «—» and hide the percentage until there are a few lessons).

**T-UX-8 Lesson report form.** Seen: the form uses about two thirds of its card; no nav tab is active and there is no way back to the student or to Today; attendance is not prefilled although the lesson is already marked absent elsewhere.

**T-UX-9 Student file.** Seen: each «Reports not written yet» row repeats the student's name on the student's own page; two lesson tables («Lessons in the next 14 days» and the month picker) could be one list.

### U10

**UX-16 Consistency and accessibility.** Seen on the dashboard: ten font sizes (12, 13, 15, 16, 18, 19, 24, 26, 28, 32 px) and 38 links or buttons smaller than 28 px in one dimension. Done when: sizes come from the type tokens and targets meet the kit's minimum (rule 17). Shared fixes follow the lanes of docs/61 §8 where they overlap.

### U11

**UX-1 Slow page loads.** Seen: after navigation most pages show a skeleton for 5 to 9 s; the schedule was still a skeleton at 9 s; a hard load first shows a full-screen splash. Do: profile the data fetching of the schedule, teachers, payments and finance pages (waterfalls, unbounded reads, a query per row) from the code and the e2e traces. This PR is the findings and a proposed fix per bottleneck; larger changes wait for the owner. Target: list pages show data in under about 2 s on a normal connection.

## D-lane items

**DATA-1 Finance «Teacher payouts» shows earnings, not payouts.** Seen: the finance page's «Teacher payouts» for the year equals the total still owed on the payouts page converted at the page's rate, while the payouts page shows nothing paid; for the current month the payouts page says «No lessons counted this month» although finance shows an amount for it. Make label and number agree on both pages (see «Owner decisions»), and find why the month differs.

**DATA-2 Lesson balance exceeds the package size.** Seen: the messages side panel of one subscription shows more lessons left than its package holds; the same subscription shows «Active» and «Unpaid» after its payments were refunded in full. Check the lessons-left sum and how a full refund shows.

**DATA-3 Past lessons stuck in pre-lesson statuses.** Seen: the dashboard's «Pending reports» lists lessons a month old still marked «Needs confirmation» or «Confirmed». A past lesson should reach a final status: look for a missing job, a job that is switched off, or a missing transition. If the cause is a setting on the live system and not code, report it and change nothing.

**DATA-4 Dashboard counts disagree with their destinations.** Seen: «Needs confirmation» links to a schedule view that shows a smaller count for the current week (either the scopes differ or one count is wrong: make the link land on the same set); «Lessons today» lists only the lessons still to come while the schedule shows earlier ones today too (rename to «Remaining today» or count all).

**DATA-5 Possible duplicate packages in receivables (report only).** Seen: one student has several identical unpaid rows created the same day, and another has two near-equal rows on one day. Report the rows and how they were created; delete nothing.

**DATA-6 Test records in production totals.** Seen: students, a teacher and internal meetings that are plainly tests count in receivables and dashboards. See «Owner decisions».

**DATA-7 Student tab counts.** Seen: All is three more than Subscribed plus Trial. Find the statuses of the rest and whether a tab is missing.

**DATA-8 Job applications.** Seen: every row shows the same «Applied on» date and the status «New»; several have «—» as the name. It looks like an import time standing in for the real date. Fix the logic that shows or stores it; report the rows.

**DATA-9 Guardian names.** Seen: guardian names that are «-», emoji only, or a handle copied from a chat profile. Add validation where a name is entered and a fallback where it is shown; report the rows.

**DATA-10 Gross margin rounding.** Seen: the headline margin is one unit away from revenue minus the two cost lines, and from the sum of its monthly rows. Round once, at the end.

**DATA-11 Unpaid subscription using lessons (report only).** Seen: a subscription with nothing paid has lessons used. Confirm the rule in docs/03 and report the rows.

**T-DATA-1 One lesson, two times.** Seen: the schedule, the students list and the student file show a lesson in the teacher's zone; the lesson report header shows it an hour later, in the academy's zone. The report page is not formatting in the viewer's zone.

**T-DATA-2 Lesson numbering disagrees.** Seen: for one lesson the report header says «Lesson 3 of 8» and the student file says «Lessons: 4 of 8». Check which statuses each counter includes and use one counter.

**T-DATA-3 Teacher students tab counts.** Seen: All is one more than Subscribed plus Trial. Same cause as DATA-7.

**T-DATA-4 Past lessons with no outcome.** Seen: lessons one and three weeks old still read «Not recorded». Related to DATA-3.

**T-DATA-5 Reports requested for absent lessons.** Seen: «reports waiting» counts lessons whose status is absent. See «Owner decisions».

**T-DATA-6 Opening the report form creates a draft.** Seen: a lesson read «No report yet»; after the form was opened and nothing typed it reads «Draft». Create the draft on first input, not on page load.

**T-DATA-7 Lessons booked outside availability.** Seen: a teacher available from mid-morning to late evening has entries just after midnight and at 3 AM, both moved later to the same hour in the afternoon: an AM/PM slip at booking. Validate a booking time against the teacher's availability, or warn before saving.

**T-DATA-8 Admin and teacher schedules show different sets.** Seen: for one teacher and week the teacher view lists more lessons (cancelled and moved ones included) than the admin schedule. See «Owner decisions».

**T-DATA-9 Attendance may count cancellations as absences (unconfirmed).** Seen: students whose last lesson is cancelled show «Absent 1 · 0%». Verify that the absence is a real earlier lesson; fix the counter if it is not.

## What the read-only reports showed (2026-11-27)

The reports ran read-only on the live data. The rows went to the owner; this section keeps only what a fix needs, with no record named. Each line narrows where its PR should look.

| Item | What the data shows | What it means for the fix |
|---|---|---|
| DATA-2 | No single package has more lessons left than it holds. The student in question has several open copies of one package (DATA-5). | Look at the panel's sum over a student's open packages, not at the balance of one package. |
| DATA-3, T-DATA-4 | Only a few past lessons (about 2 in 100) are still «scheduled» or «confirmed». All come from weekly rules, none has attendance, and none had its room opened. | The step that closes past lessons runs. Find the case it leaves out: a lesson nobody opened or recorded. |
| DATA-5 | Every duplicate is its own «create» by one sales account, seconds to minutes after the first, each with its own request id; several have a pay link. Some were closed later with the existing «cancel duplicate» action. | Nothing is retried by the system: the form lets the same package be saved again. A question before a second open package with the same terms would stop it (see «Owner decisions»). |
| DATA-7, T-DATA-3 | The students outside «Subscribed» and «Trial» are exactly those whose status is `expired`. | A missing tab, not a wrong count. |
| DATA-8 | Every applicant row was written by the sheet import in one batch and never changed since. About half have an empty name. The import keeps the sheet row it came from, but no application date. | «Applied on» shows the import time. The real date has to come from the sheet (a column the import fills), or the label must say «Imported on» until then. |
| DATA-9 | About a dozen guardian names are punctuation, an emoji, one character, a phone number or a chat handle. All come from the direct WhatsApp source, where the name is the chat profile's. | The fallback at display covers them; validation belongs where a person types a name, and the chat source needs a default when the profile name has no letters. |
| DATA-6 | The test flag is set on one student and one login. A demo teacher and a meeting titled as a test carry none: teachers and meetings have no test flag. | With the default (only flagged records leave the totals) those two stay in. A flag for teachers and meetings is a migration, so it waits for the owner. |
| DATA-11 | A few unpaid packages have lessons used. One is a duplicate copy that carries the used lessons while the paid copy carries none; one is a zero-price package shown as «unpaid»; one has more lessons used than it holds. | Used lessons go to the first open package, paid or not. Check that rule against docs/03, and show a zero-price package as something other than «unpaid». |

## Status

Each PR sets its rows: `fixed (#n)`, `not a bug: <why>`, `waits for the owner: <what>`, or `needs the contracts lane`.

| Item | Status |
|---|---|
| UX-1 … UX-3 | open |
| UX-4 | fixed (#1076): the nav scrolls in its own box above a plain foot; the theme and time-format switches moved to the account page |
| UX-5 | fixed (#1076): the side panel sits beside the chat only when the thread is 48rem wide, else it folds under it |
| UX-6 | fixed (#1076): schedule chips wrap names and statuses, the week grid fits 1408px, the lead status column fits the longest chip, the students note wraps, the inbox search has its own row |
| UX-7 … UX-16, T-UX-1 … T-UX-9 | open |
| DATA-1 … DATA-11, T-DATA-1 … T-DATA-9 | open |
| DATA-12 | in `fix/users-role-record` |
