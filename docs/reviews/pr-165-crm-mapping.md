# Review: PR #165 (crm mapping) — adversarial, six lenses

Branch `cloud/crm-mapping` (one commit, +1128/-36, 49 files, migration `20261025000680_template_crm_name.sql`).
Six independent lenses tried to refute the PR: 1 send shapes, 2 duplicates / losses, 3 no regression on meta /
kapso / module mode, 4 security + audit, 5 UI / mobile (heuristic-evaluation, design-qa-checklist,
critique-brand-consistency), 6 repo rules. A finding is kept only with file:line and a concrete scenario.
Fixes are on `cloud/crm-mapping-review`.

**Not verified:** the wacrm source at `98b5bd2…` (public-api.md, messages/route.ts, template-send-builder.ts)
was not reachable from this session (raw.githubusercontent.com 404, repository not attached). The CRM request
shapes are checked against docs/19 only. Before switching a line: confirm in the CRM that `buttonParams` is
keyed `"0"`, `"1"` (0-based, strings) and takes the URL suffix, and that `report_session` /
`report_trial_session` have no variables.

## Important (8) — 7 fixed, 1 not fixed

| # | Where | Scenario | Outcome |
|---|---|---|---|
| I1 | `crm-body.ts` crmTemplateParams | Admin sets teacher_new_student's crm_name = `teacher_new_student` (the CRM's copy of the Meta template, 3 vars): the CRM got 5 body values + 2 buttons → refused, every teacher alert fails | **Fixed**: CRM values only when the name sent differs from `meta_name` |
| I2 | `crm-body.ts` + `teacher-alert.crm.ts` | A row without `params.crm` (queued before the deploy, or no teacher name / code / end time) went out as `teacher_lesson_v2` with the 3 Meta values → refused or wrong slots | **Fixed**: `crmRowName` falls back to `meta_name` + Meta values (the pre-PR behaviour) when the default name applies and the row has no CRM values; an admin's crm_name is sent as set |
| I3 | `crm-report.ts` afterDocument | PDF sent, then the template call times out / 5xx / 2xx without wamid; the row said «its CRM template was not» sent → admin retries → guardian gets PDF + template twice | **Fixed**: the text distinguishes «the CRM refused its template» from «may have gone too: check the CRM before a retry»; both say a retry re-sends the PDF; crmCode and credential are kept |
| I4 | `crm.client.ts` / `messages.service.ts` | PDF sent, template refused: M1 retry re-sends the PDF, M2 / M3 never send the template — no way to finish the report without a second PDF | **Not fixed** (needs a design change: keep the document's wamid on the row and skip it on retry). Documented in docs/19 and in the row's error text |
| I5 | `template-crm-name.ts:16` | Module mode: a crm `wa_numbers` row serves a meta line; a crm_name left from the line's crm days is read by that number and cannot be cleared (409 not_crm_line) | **Fixed (partly)**: reset to default allowed on any line (audited). Setting a new name for a module-mode crm number still needs the line on crm, like the hand-set crm status (pre-existing) |
| I6 | `LineDrivers.tsx` (mobile) | Module mode (`comms_source` = module): each number's provider sends and WA_PROVIDER is overlaid, so the switch saves a value that changes nothing and readiness lists legacy keys as missing | **Fixed**: module mode shows a note pointing to «الأرقام», no switch |
| I7 | `ar.json` `communicationsHub.driverMissing` | The note sent the admin to «الحماية» for every key, but Meta / Kapso line ids and tokens live in «الأرقام» › «إعداد الخطوط السابق (من التكاملات)» | **Fixed**: names both places |
| I8 | `report-pdf.source.ts:89`, `use-crm-name.ts` | The trial / regular pick at its source and the web save flow had no test; a broken comparison or a dropped `setEditing(null)` would pass CI | **Fixed**: source test (trial rule / other / no rule, select carries the embed) and `TemplateHealth.crm-name.test.tsx` (only crm rows offer it, PUT, row updated, dialog closed, toast; refused save keeps it open) |

## Minor (19) — 9 fixed, 10 not fixed

| # | Where | Scenario | Outcome |
|---|---|---|---|
| m1 | `teacher-alert.crm.ts:24-25` | A nameless student shifted the codes against the names | **Fixed**: one filtered list; any gap → no CRM values (I2 fallback) |
| m2 | `crm-report.ts` afterDocument | Key revoked between the two calls lost `credential: 'crm'` | **Fixed** (kept on the error) |
| m3 | `wa-json.ts:21` | A malformed `crm` part emptied ALL params (any driver → 132000) | **Fixed**: `.catch(undefined)` drops only the crm part; test |
| m4 | `LineDrivers.tsx:41` | Two lines could save at once; the first row's confirm re-enabled | **Fixed**: every row waits while a save runs; test |
| m5 | `LineDriverRow.tsx:28-30` | A stale pick could reopen the confirm after a later change elsewhere | **Fixed**: the pick is cleared once it is the current driver |
| m6 | `ar.json` driverIntro / `en.json` | «ميتا مباشرة» vs «Meta مباشرة»; RTL arrow in English | **Fixed** |
| m7 | `CrmNameButton.tsx`, `ar.json` crmName.edit / saved | Noun label, not an action; «حُفظ … في نظام CRM» read as written into the CRM | **Fixed**: «عدّل اسمه في نظام CRM», «حُفظ الاسم الذي يُرسَل به … إلى نظام CRM» |
| m8 | `crm-report.ts:20`, `line-driver.ts` | Missing-document guard and lineDriver fallback untested | **Fixed**: tests added |
| m9 | `teacher-alert.crm.ts` | Arabic comma literal in code | **Fixed**: `ar.common.listSeparator` |
| m10 | `crm-report.ts` | A 429 between the PDF and the template becomes uncertain instead of waiting | Not fixed: an in-client wait adds timers to the send path; the row is visible to the admin (I3 text) |
| m11 | `teacher-alert.crm.ts` | Imported trial lessons (rule_id null) read as regular → report_session | Not fixed: imported lessons are history; the platform marks trials by rule package |
| m12 | `crm-report.ts:25` | If the CRM report templates do have variables, every report fails after its PDF | Not fixed: unknowable here; docs/19 gates the switch on an owner check |
| m13 | `integration-config.controller.ts` | Driver-switch audit names the key, not from / to | Not fixed: pre-existing for the web save too; out of this PR's scope |
| m14 | `crm-report.ts:24` | The 7-day signed PDF URL is kept in the CRM's history | Not fixed: same as the existing header path; expires |
| m15 | `message.mapper.ts:80` | `params.crm` (login-only paths) appears in message views | Not fixed: nothing renders it; not a leak |
| m16 | `LineDriverRow.tsx` | Raw key names vs the web's labels | Not fixed: the brief asks for key NAMES |
| m17 | `LineDrivers.tsx:23` | No loading state; last «saved» stays | Not fixed: cosmetic |
| m18 | `CrmNameDialog.tsx` | No explicit «back to default» button | Not fixed: blank = default, said in the dialog |
| m19 | `templates.controller.ts` crm-name | No controller-level 400 test | Not fixed: schema tested in shared, guard pinned by the parity file |

## Verified (could not refute)

Name / language fallback only on crm (`crm-body.ts`, `crm-report.ts`; Meta `templateMessage` unchanged); teacher
alert order [teacher, students, codes, time in the teacher's tz, «n دقيقة»], buttons `"0"`/`"1"` suffixes;
report = document then template, one row, dedup `report_ready:{id}`, compare-and-set claim, SENDING crash →
uncertain, no false «sent»; Meta / Kapso bodies, teacher alert values and report params unchanged; the lessons
embed uses one FK; PUT crm-name is templates.manage + TemplateManagerGuard (admin, parity file), zod + DB CHECKs,
audited; mobile switch = the web's audited `PUT /settings/integrations` (settings.write), key names only; no
secrets or personal data; migration additive, idempotent, new file; 150 lines / 3 params / strict TS; ar/en
parity; MSA; RTL logical props; 44pt pills; `native-changes.mjs c140b4cc` → no native change.
