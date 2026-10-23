# 26b — Settings redesign: UI/UX (information architecture, control map, states, mobile, review)

Companion of `docs/26-config-redesign.md` (architecture, migration, phases, owner questions). Brand: docs/07
(Ink & Gold, green brand tokens, Amiri titles, Plex UI, nuqta status glyphs, one cartouche per screen). Copy: clear
Modern Standard Arabic (CLAUDE.md rule 10); raw key names only as small LTR text in a row menu or a detail. Mockups
(static, self-contained, fake data only, light and dark): `docs/design/26-config/` — `hub.html`, `values.html`,
`values-390.html`, `notifications.html`, `mobile.html`, and `states.html` (every dialog and state), all on the shared
`tokens.css`.

## 0. Owner feedback (2026-10-23) and what changed

After seeing the first mockups (PR #139) the owner wrote, verbatim: «i dont like long pages», then «stick with table».

| Before (PR #139) | Now |
|---|---|
| «القيم»: every group on one long page, each value a stacked block (label, description paragraph, editor, impact note, meta line with the key) | **A compact table**, one row per value, and **one group per view**: the group list switches which group the table shows |
| Phone «القيم»: the same blocks stacked, editors full width | **A two-column table** (الاسم \| القيمة); a tap opens the editor in a **bottom sheet** |
| «الإشعارات»: one long table with all four audiences and a manual list under it | **Audience tabs** (ولي الأمر · المعلم/ة · العميل · فريق الأكاديمية · يدوي), one table visible at a time; same columns |
| Hub: five large tiles with a description each, shown at two widths | **A five-row table** (القسم \| الحالة الآن \| فتح), one responsive screen |
| Each mockup ended with a board of dialogs and states | **`states.html`** holds every dialog and state (32 examples, each tagged with where it came from); each main mockup is one screen |

Measured heights (Chromium, `scrollHeight` of the page and of the app frame; the board header above the frame is
mockup annotation): see §7b «Heights».

## 1. Information architecture

```
/admin/settings  «الإعدادات» (hub: search + a five-row table, each row with its live state)
├── /admin/settings/values        «القيم»            the key/value/description store (docs/26 §1 CONFIG + read-only module rows)
├── /admin/communications         «التواصل»          docs/23 §2d: نظرة عامة · الأرقام · الإشعارات · القوالب · الحماية
├── /admin/settings/integrations  «التكاملات»        LiveKit, Expo, Web Push, أسعار الصرف (Vault secrets)
├── /admin/settings/google        «مزامنة Google»    docs/24 (connection, switches, mappings, log)
├── /admin/settings/appearance    «المظهر»           per-device theme (unchanged behaviour)
└── related: /admin/translations «الترجمات» · /admin/roles «الأدوار والصلاحيات» · «سجل النشاط»
```

- **Hub table** (`hub.html`): columns «القسم» (name + one muted line, truncated), «الحالة الآن», «فتح» (a link «افتح»). The state
  is data, not a link label: «القيم — 28 قيمة · 5 معدَّلة · 8 عامة»; «التواصل — الإرسال متوقف» (struck glyph + word)
  with the reason under it; «مزامنة Google — متصل · تجربة بدون كتابة»; «التكاملات — 3 خدمات مضبوطة · خدمة غير
  مضبوطة». The whole row is the link; on the phone the description and the «افتح» column drop. The hub search covers
  labels, descriptions, keys and module pages, and jumps to the row or tab (results: `states.html#hub`).
- **Old links keep working** (docs/26 §4 compat): `/admin/settings#integrations` → `/admin/settings/integrations`
  (this also fixes today's non-scrolling anchor, 26a Part D §1.12); the Google OAuth callback and the
  `google_sync_alert` bell link → `/admin/settings/google`; `#settings-messaging` → «التواصل» (until docs/23 phase 6
  the page shows today's messaging section unchanged); `#settings-<group>` → `/admin/settings/values?group=<group>`,
  which opens that group's view.
- **Until docs/23 phase 6** «التواصل» is today's messaging section on its own page; phase 6 replaces it with the tabs
  drawn in `notifications.html`.

## 2. «القيم» — the key/value/description table

**One group per view.** The group list (desktop: a side list; phone: a short strip of chips) switches which group's
rows the table shows: الجدول والحلقات 4، الحلقات عبر الإنترنت 4، التقارير 1، الحسابات والدفعات 5، مستحقات المعلمين
3، الملفات المرفوعة 1، الأكاديمية 5، الرسائل 2، المبيعات 1، السجلات والاحتفاظ 2 (= 28)، then «قيم مخصصة» 5 and, under
«تُدار من صفحة أخرى», «الإشعارات» 8، «الإرسال والحماية» 3، «مزامنة Google» 3 (= 14; the Expo strip has the same three). The largest view has 8 rows, so
no view needs more than about one screen. The URL keeps the group (`?group=accounts`). **«الكل» is not a group**: it
appears only as the result of the search («ابحث بالاسم أو الوصف أو المفتاح») or of the filters «المعدَّلة فقط» (5) and
«العامة فقط» (8), and lists the matches from every group with the group name under each label; «امسح البحث» returns
to the last group (`states.html#values`).

**The table** (`<table>` with a `<caption>` naming the group and its count, `<th scope="col">`, and the label cell as
`<th scope="row">`). Row height stays small (about 52 px; two lines at most):

| Column | Content |
|---|---|
| الاسم | The label (Plex 600), then tags «عامة» (visible before login), «يطلب تأكيدًا» / «يحذف بيانات» (from the registry `confirm`), and the mark «معدَّلة» (half nuqta) when the stored value differs from the default. Under it **one muted line**: the stored description, truncated with an ellipsis. The line is a button: it opens «تعديل الوصف» (read it in full, edit it, restore the seeded text) |
| القيمة | The inline editor by type: number + unit (dense 32 px input, `aria-describedby` → the bounds), switch (named by the row label), select (currency, time zone), phone in E.164 (`<input type="tel" dir="ltr">` + «يُحفظ بالصيغة: …» preview), text; a nullable value is a switch + number in the same cell; a fixed shape of two fields shows a one-line summary + «عدّل الحقلين» (a dialog). Module-owned rows show the value as text + «تُعدَّل من التواصل ← الإشعارات» |
| الافتراضي | The default, and under it the bounds («من 1 إلى 12») or «24 عند التشغيل» for a nullable value |
| آخر تعديل | Who, and when on a second line; «لم تُعدَّل بعد»; for a dirty row «لم يُحفظ» + «المحفوظ: 2» |
| إجراء | «حفظ» + «تراجع» only while the row is dirty. Otherwise one «⋯» button that opens the row menu: «اقرأ الوصف وعدّله», «أعد القيمة الافتراضية (5)» (only when modified), for custom rows «اجعلها عامة…» and «احذف القيمة…», and **the developer key** («للمطوّر: المفتاح» `booking_horizon_weeks` + «انسخ المفتاح»). The key is never a visible line in the row |

**Row states live inside the row** (drawn together in the «الحسابات والدفعات» view of `values.html`):
- **Dirty:** green inline-start rule and wash on the row; «حفظ» and «تراجع» in the action cell; «لم يُحفظ · المحفوظ: …»
  in the last-change cell. The page head counts «قيمتان لم تُحفظا» (a link to the group). Saffron is never used for
  this: it means «دورك» only (docs/07 §1).
- **Validation error:** red border on the input, `aria-invalid`, and one line under it in the same cell («اكتب عددًا من
  1 إلى 90», struck glyph, inside a polite live region, linked by `aria-describedby`); «حفظ» is `aria-disabled`.
- **Saving:** the switch or input is disabled, the action cell reads «جارٍ الحفظ…» (`role="status"`), the row is
  `aria-busy`; other rows stay editable.
- **Conflict (409):** the row keeps its value; **an inline row below it** (`<tr>` spanning all columns, saffron rule,
  `role="alert"`) says «غيّرت سارة هذه القيمة إلى 6 قبل دقيقتين. قيمتك: 8.» with «احفظ قيمتي» / «اعتمد القيمة
  الجديدة».
- **Saved:** toast «تم حفظ القيمة» with «تراجع» (5 s), also announced by a polite live region under the table.

**One save model:** each row saves on its own (`PATCH /config/entries/:key` with its `version`); leaving the page with
unsaved rows asks first. **Confirmations** come from the registry (`confirm`): a plain dialog for booking-wide
switches (`teachers_always_available`, `meeting_link_auto`, `sales_auto_assign`); **typed** for values that delete data
(`recording_retention_days`, `activity_retention_days`: type the number of days). The server re-checks typed
confirmations (428). The impact sentence that used to sit under each dangerous row now lives in its confirmation
dialog and its description; the row keeps only the short tag.

**Module-owned rows** (the three «تُدار من صفحة أخرى» views): read-only table rows, value as text + a link to their
page; the menu still shows the key. **«قيم مخصصة»** (docs/26 phase 5): «أضف قيمة» in the page head — key (LTR), type
(نص، رقم، نعم/لا، قائمة، JSON), value, description (required), «عامة؟» (confirmation: «ستظهر هذه القيمة لأي زائر قبل
تسجيل الدخول»); delete is in the row menu and keeps its dialog («نعم، احذفها»).

### Phone (`values-390.html`, and the same markup below 640 px)

- Page head: the cartouche and «أضف قيمة» on one line, the counts under them; the search; then the group strip
  (chips, 44 px, scrolls sideways). Filters and the unsaved count are desktop-only (editing on the phone happens in
  the sheet, so a row is never left dirty).
- **A two-column table, الاسم | القيمة.** The value cell is one button (44 px min., the whole row is its hit area)
  showing the value as text and a chevron, plus a small second line only for «جارٍ الحفظ…» or «قيمة أحدث من سارة».
  Description, default, last change, tags and the key are not in the row.
- **Tap → bottom sheet** (`states.html#values-phone`): the label as title, the full description + «عدّل الوصف», the
  editor (16 px text, 44 px tall), bounds, «الافتراضي: … · أعد القيمة الافتراضية», «آخر تعديل: …», the impact note
  when the value asks for confirmation, «احفظ» (primary) + «إلغاء», and «للمطوّر» (a closed details with the key).
  Validation, conflict («احفظ قيمتي» / «اعتمد القيمة الجديدة») and «جارٍ الحفظ…» are drawn inside the sheet; the result
  is announced by a polite live region and the toast. Closing the sheet with an unsaved edit asks first.
- Shapes of two fields are read-only in the sheet on the Expo app («عدّلها من الموقع»); the web sheet edits them.

### States (every page of the hub follows them; drawn in `states.html`)

| State | Rendering |
|---|---|
| Loading | skeleton rows of the real row height; the toolbar is usable; `aria-busy` on the table |
| Empty search | «لا توجد قيم تطابق بحثك» + «امسح البحث» (docs/07 §10) |
| Load error | inline alert (struck glyph) «تعذّر تحميل القيم» + «أعد المحاولة»; nothing editable |
| Read-only (no `settings.write`) | chip «للاطلاع فقط» under the title; values as text; no editors, no «⋯», no buttons (today every control renders and the save fails with 403). Phone: an info alert above the table; the sheet opens read-only |
| Dirty | inside the row, as above; a count «قيمتان لم تُحفظا» in the page head |
| Saving | inside the row: «جارٍ الحفظ…», the editor disabled; other rows stay editable |
| Saved | toast «تم حفظ القيمة» with «تراجع» (5 s); a failed save shows «تعذّر حفظ القيمة» + «أعد المحاولة» |
| Validation | one line under the editor in the same cell, struck glyph, linked by `aria-describedby`: «اكتب عددًا من 1 إلى 12» |
| Conflict (409) | saffron (it is «دورك»: the save waits for the admin's choice) inline row under the row: «غيّرت سارة هذه القيمة إلى 6 قبل دقيقتين. قيمتك: 8.» + «احفظ قيمتي» / «اعتمد القيمة الجديدة» |
| Owned by a module (409) | not reachable from the UI (read-only rows); the API answer is shown as a plain error if it happens |

## 3. Module pages

- **التواصل → الإشعارات** (`notifications.html`): a state strip in the page head («إرسال الرسائل: متوقف», «الرسائل
  التلقائية», queued count, and the link to «نظرة عامة»); then **audience tabs**, one table visible at a time: ولي
  الأمر 7، المعلم/ة 2، العميل 1، فريق الأكاديمية 3، يدوي 5. Columns stay: «الإشعار ومتى يُرسل» (name + timing editor;
  times are selects or bounded numbers, never typed text), «عبر», «من رقم · القالب» (number select + template
  status), «هل يُرسل الآن؟» (the state in one word and **the reason** in a line: «لا يُرسل لأن إرسال الرسائل متوقف»,
  «وكذلك لأن ميتا رفضت القالب»), «التشغيل». A dirty row shows «لم يُحفظ: قبل الحلقة بـ 45 دقيقة بدلًا من 60» + «حفظ» /
  «تراجع» in an inline row under it. Essential rows (booking confirmation, report PDF; tag «أساسي») turn off only with
  a typed «إيقاف» and an activity-log entry (docs/23 owner answer 3); locked rows (`reminder_failed`) say «لا يمكن
  إيقافه»; switching on a family-facing row says whom it reaches. `renewal_due` shows `renewal_alert_remaining` by
  reference with a link to «القيم». The «يدوي» tab lists the five manual messages and where each is sent from.
  **Phone:** two columns (الإشعار | التشغيل); under the name the state and a short reason («الإرسال متوقف»); a tap
  opens the row editor (timing, number, switch) in a bottom sheet.
- **التكاملات**: one card per service, one «حفظ» per card; secrets write-only, a confirmation when a save replaces a
  stored secret, clearing keeps its dialog; the WhatsApp and Kapso groups move to «التواصل» (docs/23 phase 3/6).
- **مزامنة Google**: today's cards on their own page; «أوقف المزامنة» gains a confirmation.
- **المظهر**: unchanged (per device).

## 4. Mobile admin (Expo)

`/more/ops/settings` stays (push deep links open it) and becomes the list «الإعدادات»: «القيم», «التواصل», «مزامنة
Google», and the line «التكاملات: تُدار من الموقع». **«القيم»** is the same two-column table and bottom-sheet editor as
the web phone layout (editable with `settings.write`: scalars with per-row save and the same confirmations; shapes,
lists, «أضف قيمة» and description edits «عدّلها من الموقع»). **«التواصل»**: send state read-only; catalogue switches
editable with the same confirmations (the typed «إيقاف» is a bottom sheet); numbers, credentials and templates
«تُدار من الموقع». **«مزامنة Google»**: read-only card, unchanged. No frame, no cartouche; nuqta, green and saffron stay
(docs/07 §12); inputs 16px and ≥ 44px tall. Every frame in `mobile.html` fits a 390×844 screen.

## 5. UX rationale (short)

1. **One page per question, one screen per view.** «What is this value and what does it do?» → «القيم», one group at a
   time, the description one tap away. «What is sent, when, from which number?» → «التواصل», one audience at a time.
2. **A table, because the owner reads settings as a list.** Name, value, default and last change line up, so a changed
   value is seen by scanning one column; the long text (description, impact, key) is one tap away instead of on screen.
3. **One save model per page.** Today's page has five save paths and one «حفظ» that sends every field, silently
   undoing another admin's change (26a Part D §5). Per-row saves with a version check make conflicts visible.
4. **State on the hub.** The owner sees «الإرسال متوقف» before opening anything; dangerous state is never hidden
   behind a link.
5. **Danger is declared in data.** `confirm` and `reachesFamilies` live in the registry, so web and mobile ask the
   same question, and the server enforces typed confirmations.
6. **Plain words.** Arabic labels and descriptions first; key names only as small LTR developer text in the menu.

## 6. Old → new control map (all 127 controls of today's page; ids = 26a Part D §1)

Abbreviations:
- V = «القيم» `/admin/settings/values`, followed by the group.
- C = «التواصل» `/admin/communications`, followed by the tab: OV نظرة عامة, NUM الأرقام, NOT الإشعارات, TPL القوالب, SAFE الحماية والتجربة. TOP is the strip that is always visible.
- INT = «التكاملات» `/admin/settings/integrations`.
- G = «مزامنة Google» `/admin/settings/google`.
- AP = «المظهر» `/admin/settings/appearance`.
- HUB = `/admin/settings`.

How rows in V save: V is a compact table, one group per view (§2). Each row saves on its own, with «حفظ» and «تراجع» in its action cell; a row edited by someone else shows the conflict alert in an inline row under it. On the phone a row opens a bottom-sheet editor.

Mobile column: **edit** = editable on the new Expo screen with `settings.write`; **ro** = read-only; **web** = web-only, with the note «افتح في الموقع» or «عدّلها من الموقع».

**ADDED** marks a confirmation that does not exist today.

### 6a. Web controls

| # | Today: section → control | Key / store | New home | Editor + confirmation (new) | Mobile |
|---|---|---|---|---|---|
| 0.1 | chrome → title «الإعدادات» | — | HUB cartouche «الإعدادات»; each page has its own title | — | ro (list screen title) |
| 0.2 | chrome → index «أقسام الإعدادات» (11 anchors) | — | HUB table rows (V, C, INT, G, AP) + «روابط ذات صلة»; V group list (side list; phone chip strip), one group per view; old `#settings-<id>` anchors redirect to `?group=<id>` | nav | list screen; V group strip |
| 0.3 | chrome → search «ابحث في الإعدادات» | client filter | HUB global search (labels, descriptions, keys, module pages) + V toolbar search «ابحث بالاسم أو الوصف أو المفتاح»; results show as the view «الكل» (rows from every group) | search; empty state «لا توجد قيم تطابق بحثك» + «امسح البحث» | edit (V search) |
| 0.4 | chrome → load states | `GET /settings` | every page: skeleton table rows (`aria-busy`) + inline alert «أعد المحاولة» (`states.html`) | — | same |
| 0.5 | chrome → toast «تم حفظ الإعدادات» | — | per-row toast «تم حفظ القيمة» + polite live region; module toasts kept | — | same |
| 0.6 | chrome → SaveBar «حفظ» (whole form PATCH) | all FORM_KEYS | **removed**: replaced by per-row «حفظ»/«تراجع» in the V action cell (phone: «احفظ» in the bottom sheet); asks before leaving with unsaved rows | per-row save; conflict inline row «احفظ قيمتي / اعتمد القيمة الجديدة» | edit (per row in the sheet; old APK keeps its form save via m2) |
| 0.7 | chrome → «أعد القيمة الافتراضية» | default | V row menu «⋯» → «أعد القيمة الافتراضية (…)» (only when modified) + the column «الافتراضي»; phone: link in the sheet | saves like any edit | edit (sheet) |
| 0.8 | chrome → «معدَّل», «آخر تعديل: … بواسطة …» | `/config/meta` | V mark «معدَّلة» next to the label + column «آخر تعديل» (who / when); filter «المعدَّلة فقط» (result view «الكل») | — | ro meta (sheet) |
| 1.1 | messaging → DangerFrame «إعداد حساس…» | — | C TOP strip (in the page head) + SAFE tab framing | — | ro |
| 1.2–1.3 | messaging → «نقلنا الرقم من الـCRM» / «أعد التحذير» | `crm_cutover_done` | C SAFE «CRM cut-over»; warning repeated on OV and in the sending confirmation | button + **ADDED** confirm both ways (dialog, cancel focused) | ro (shown on OV) |
| 1.4 | messaging → «إرسال الرسائل» | `messaging_enabled` | C TOP + OV master switch | kept: ConfirmSwitchDialog both ways (queued count, CRM warning) | ro (send state) |
| 1.5 | messaging → server gate note | `GET /messages/gate` | C TOP («متوقف/يعمل», queued count) + OV gate in words | — | ro |
| 1.6 | messaging → «الرسائل التلقائية…» | `auto_messages_enabled` | C TOP + OV second master switch | kept: ConfirmSwitchDialog both ways | ro |
| 1.7 | messaging → «بعد انتهاء الحلقة» buttons/link | `feedback_mode` → `notification_rules.lesson_rating.enabled` | C NOT row «أزرار تقييم الحلقة» (tab ولي الأمر) | toggle + **ADDED** confirm (ON: «سيصل إلى N ولي أمر»; OFF: dialog) | edit (catalogue toggle) |
| 1.8–1.9 | messaging → «خطوط واتساب», «افحص الخطوط», line rows | lines check, `wa_line_health` | C NUM one card per number with «افحص الآن» + «تفاصيل تقنية»; health glyph on OV | button, no confirm (read-only Meta call) | ro (OV cards); check is web-only |
| 1.10 | messaging → «ماذا يُرسل ومتى» (read-only, 25 rows) | `GET /admin/notifications` | C OV table (ro) + C NOT the catalogue, now editable, **one audience tab at a time** (ولي الأمر · المعلم/ة · العميل · فريق الأكاديمية · يدوي) | essential rows off need a typed «اكتب: إيقاف»; locked rows | edit (toggles), ro (timing) |
| 1.11 | messaging → «تذكير الحلقة قبلها بكم دقيقة» | `reminder_minutes_before` → `lesson_reminder.timing.minutes_before` | C NOT row «تذكير الحلقة» (ولي الأمر) | timing «قبل الحلقة بـ [60] دقيقة», bounds 5–720 | ro timing |
| 1.12 | messaging → «تذكير قبل الحلقة بيوم» | `reminder_24h_enabled` → `lesson_reminder_24h.enabled` | C NOT row «تذكير اليوم السابق للحلقة» (+ «اليوم السابق الساعة [20:00]») | toggle; **ADDED** family-facing ON confirm («سيصل إلى…»), from the IA rule | edit |
| 1.13–1.14 | messaging → «رسالة واتساب للمعلم/ة عند حجز طالب جديد», «تذكير المعلم/ة بالحلقة» | `teacher_whatsapp_*` → `teacher_new_student` / `teacher_lesson_reminder`.enabled | C NOT rows (tab المعلم/ة) | toggle + channels; no confirm (teacher-facing) | edit |
| 1.15 | messaging → «المتابعة بعد كم ساعة من آخر رسالة» | `follow_up_hours` → `follow_up_slots.timing.hours` (leads also reads it) | C NOT row «متابعة العميل بموعدين مقترحين» (tab العميل) | list of numbers, ascending, ≤5 | ro on the new screen; old APK edits it via m2 alias |
| 1.16 | messaging → «مدى البحث عن الحلقات القادمة للتذكير» | `reminder_lookahead_hours` | V «الرسائل» (CONFIG: one scalar engine parameter; the «الإشعارات» tab links to it) | number 25–72 | edit |
| 1.17–1.18 | messaging → «أقرب موعد يُقترح…», «أبعد موعد يُقترح…» | `follow_up_slots_from_hours`, `_to_days` | C NOT row «متابعة العميل بموعدين مقترحين», the line «المواعيد المقترحة: أقربها بعد … وأبعدها خلال …» | numbers 1–168 / 1–30 | ro |
| 1.19 | messaging → «يُعتمد رد «نعم» المكتوب خلال كم ساعة» | `quick_reply_window_hours` | V «الرسائل» (CONFIG; may become a per-number value in docs/23 phase 5) | number 1–168 | edit |
| 1.20–1.21 | messaging → «قوالب واتساب» header, «القوالب حسب الرقم» | `/messaging/templates(/lines)` | C TPL (moved unchanged, now under a tab heading) | — | web |
| 1.22 | messaging → «مزامنة مع Meta» per line | `POST …/templates/health` | C TPL per-number block | button; no confirm (kept) | web |
| 1.23–1.24 | messaging → template table, «متاح للمعلمين والمبيعات» | `message_templates` | C TPL table + starter switch | kept as is (self-save) | web (picker keeps reading templates) |
| 1.25–1.26 | messaging → «أرسله إلى ميتا للاعتماد», «نقل إلى الرقم الآخر» | templates submit/line | C TPL; "move" becomes "choose number" in phase 5 | kept: Submit/Move dialogs | web |
| 1.27 | messaging → template toasts | — | C TPL toasts | — | — |
| 2.1 | schedule → «تُجدول الحلقات لكم أسبوعًا مقدمًا» | `booking_horizon_weeks` | V «الجدول والحلقات» | number 1–12 | edit |
| 2.2–2.3 | schedule → «حساب الإلغاء المتأخر» + hours | `late_cancel_hours` (nullable) | V «الجدول والحلقات», **one row** (switch + number) | switch + number 1–168 | edit |
| 2.4 | schedule → «يمكن تعويض الحلقة الفائتة خلال كم يومًا» | `makeup_window_days` (public) | V «الجدول والحلقات», tag «عامة» | number 1–365 | edit |
| 2.5 | schedule → «كل المعلمين متاحون للحجز…» | `teachers_always_available` | V «الجدول والحلقات», tag «يطلب تأكيدًا» (the impact sentence moves into the dialog) | switch + **ADDED** plain confirm (the button names the action) | edit (same confirm) |
| 3.1–3.3 | classroom → «تُفتح الحلقة قبل…», «تُغلق…», «عنوان الاجتماع الداخلي» | `join_opens_before_min`, `join_closes_after_min` (public), `default_meeting_title` | V «الحلقات عبر الإنترنت» | numbers / text 1–60 | edit |
| 3.4 | classroom → «الوضع الافتراضي: الحلقات عبر منصة الأكاديمية» | `meeting_link_auto` (public; default for `teachers.meeting_mode`) | V «الحلقات عبر الإنترنت», tag «يطلب تأكيدًا» | switch + **ADDED** plain confirm stating how many lessons in the next reminder window were already reminded with the old link | edit (same) |
| 4.1 | reports → «يمكن للمعلم/ة تعديل التقرير حتى كم ساعة» | `report_teacher_edit_hours` | V «التقارير» | number 0–168 | edit |
| 5.1 | accounts → «عملة الأرقام في لوحة التحكم» | `reporting_currency` | V «الحسابات والدفعات» | select (ISO list; an unknown stored code is kept) | edit (select replaces free text) |
| 5.2 | accounts → «نبّه للتجديد عندما يتبقى…» | `renewal_alert_remaining` | V «الحسابات والدفعات», **stays CONFIG** (SQL `v_student_list` reads it); C NOT row «تذكير تجديد الباقة» shows it **by reference** («من القيم» + link) | number 0–10 | edit |
| 5.3–5.4 | accounts → «يُعدّ الاشتراك منتهيًا…», «علّم الحلقات القادمة…» | `subscription_expiry_days`, `flag_future_lessons_when_unpaid` | V «الحسابات والدفعات» | number / switch | edit |
| 5.5–5.7 | accounts → «تُحسب الحلقة التي تأخر…/غاب…/التجريبية…» | `payout_count_late/_no_show/_trials` (SQL readers) | V «مستحقات المعلمين» (new group) | switches | edit |
| 5.8 | accounts → «يُعاد استخدام سعر الصرف…» | `fx_fresh_hours` | V «الحسابات والدفعات» | number 1–168 | edit |
| 6.1 | uploads → «الحد الأقصى لحجم الملف…» | `upload_max_mb` (public) | V «الملفات المرفوعة» | number 1–10 | edit |
| 7.1 | academy → «رقم واتساب الأكاديمية» | `academy_whatsapp_e164` (public) | V «الأكاديمية» (edited here) + C OV read-only «الرقم المعلن للأسر» | phone E.164, LTR | edit |
| 7.2–7.3 | academy → «المنطقة الزمنية للأكاديمية», «مدة حدّ الطلبات في استمارة الرأي» | `academy_timezone`, `feedback_rate_window_min` | V «الأكاديمية» | tz select / number 1–120 | edit |
| 7.4–7.5 | academy → «بيانات تواصل الأكاديمية», «إشعار الموافقة على التسجيل» | `academy_contact`, `recording_consent_notice` (json, public) | V «الأكاديمية» (row shows a one-line summary) | «عدّل الحقلين» / «اكتب النص» opens a dialog with the small fieldset (json shape); drawn for 7.4 in `states.html`, 7.5 uses the same dialog with two text areas (ar, en) | ro «عدّلها من الموقع» (sheet) |
| 7.6–7.7 | academy → «حذف التسجيلات بعد مدة» + days | `recording_retention_days` (nullable) | V «السجلات والاحتفاظ», **one row**, tag «يحذف بيانات» | switch + number; **ADDED** typed confirm (type the number of days) on ON and when the value is shortened | edit (same) |
| 7.8 | academy → «مدة الاحتفاظ بسجل النشاط بالأيام» | `activity_retention_days` (SQL prune) | V «السجلات والاحتفاظ» | number + **ADDED** typed confirm (type the days; IA brief) | edit (same) |
| 8.1 | sales → «التعيين التلقائي للعملاء الجدد» | `sales_auto_assign` (CONFIG) | V «المبيعات» | switch + **ADDED** confirm dialog both ways | edit (same) |
| 9.1 | appearance → «مظهر الواجهة» تلقائي/فاتح/ليلي | localStorage | AP (unchanged behaviour) | segmented, self-save | device theme (as today) |
| 10.1–10.6 | integrations → خط إشعارات واتساب: provider, Graph base/version, phone/WABA/app ids | `WA_*` plain → `wa_numbers` (phase 3) | C NUM: number card (provider, ids under «تفاصيل تقنية»); `WA_API_BASE`/`VERSION` in the global «إعدادات Graph» block of NUM | select/text, per-card save | web |
| 10.7–10.9 | integrations → «رمز الوصول», «سر التطبيق», «رمز التحقق من الربط» | Vault → `wa_number:<id>:*`; verify token global | C NUM card credentials (write-only) | password input; **ADDED** confirm on save when the secret overwrites a stored value; clear keeps its Dialog | web |
| 10.10–10.13 | integrations → خط محادثات واتساب: provider + ids | `WA_CHAT_*` plain | C NUM second card (preset role «المحادثات») | as 10.1–10.6 | web |
| 10.14–10.15 | integrations → chat token, chat app secret | Vault | C NUM card credentials | as 10.7–10.9 (**ADDED** overwrite confirm) | web |
| 10.16–10.17 | integrations → Kapso base/version | `KAPSO_*` plain | C SAFE «Kapso» block | text, own save | web |
| 10.18–10.19 | integrations → Kapso API key, webhook secret | Vault | C SAFE «Kapso» | secret; **ADDED** overwrite confirm; clear Dialog kept | web |
| 10.20 | integrations → «الأرقام المسموح بالإرسال إليها» | `WA_ALLOWED_RECIPIENTS` | C SAFE allow-list (effective value shown) | kept: confirm when emptied | ro (OV gate note) |
| 10.21 | integrations → «مزامنة القوالب مع ميتا» | `WA_TEMPLATE_SYNC` | C SAFE as a switch | switch, no confirm (as today) | web |
| 10.22–10.24 | integrations → LiveKit url/key/secret | `LIVEKIT_*` | INT group «الحلقات عبر الإنترنت (LiveKit)» | plain per-group save; secret **ADDED** overwrite confirm | web («تُدار من الموقع») |
| 10.25–10.26 | integrations → Expo base/token | `EXPO_*` | INT group «إشعارات الجوال» | same | web |
| 10.27–10.29 | integrations → VAPID public/private, subject | `WEB_PUSH_*` | INT group «إشعارات المتصفح» | same | web |
| 10.30 | integrations → «عنوان مزوّد أسعار الصرف» | `FX_API_URL` | INT group «أسعار الصرف» | text | web |
| 10.31–10.32 | integrations → Google OAuth client id/secret | `GOOGLE_CLIENT_*` | G card «عميل OAuth» (next to the redirect URI); INT keeps a link | text + secret (**ADDED** overwrite confirm) | web |
| 10.33 | integrations → «حفظ التكاملات» + clear hint | `PUT /settings/integrations` | **split**: one «حفظ» per group card (INT, C NUM, C SAFE, G); hint «اترك الحقل فارغًا…» kept per card | per-card save | web |
| 11.1–11.4 | Google → status/error, «الحساب المتصل», redirect URI, scopes | `/admin/google/status` | G connection card | read-only | ro (card, m6) |
| 11.5–11.6 | Google → «اربط حساب Google»/«أعد الربط», «افصل الحساب» | OAuth; callback → `/admin/settings/google` | G connection card | kept: disconnect Dialog | web |
| 11.7 | Google → «شغّل المزامنة» | `google_sync_enabled` | G switches card; HUB row «مزامنة Google», column «الحالة الآن» | kept: Dialog / LiveConfirmDialog | ro |
| 11.8 | Google → «أوقف المزامنة» | `google_sync_enabled` = false | G switches card | **ADDED** confirm dialog (stops calendar/Drive writes) | ro |
| 11.9 | Google → «تجربة بدون كتابة / كتابة فعلية» | `google_sync_mode` | G switches card; HUB row state «متصل · تجربة بدون كتابة» | kept: LiveConfirmDialog toward live | ro |
| 11.10 | Google → «نطاق التقويم بالأيام» + «حفظ النطاق» | `google_calendar_window_days` | G switches card (MODULE, not V) | number 7–180, own save | ro |
| 11.11–11.13 | Google → «ابحث في Google», folder/sheet, «تأكيد المجلد والجدول» | `/admin/google/drive` | G «Drive والجداول» card | unchanged | web |
| 11.14 | Google → teacher ↔ calendar map | `/admin/google/teachers` | G «المعلمون والتقاويم» | unchanged | web |
| 11.15–11.17 | Google → student search, row actions, manual link | `/admin/google/students` | G «الطلاب والمجلدات» | unchanged (unmap still has no confirm; candidate) | web |
| 11.18–11.19 | Google → «سجل المزامنة», «زامن الآن», «إعادة المحاولة» | reconcile/items | G «سجل المزامنة» | unchanged | ro (last error on card) |
| 11.20 | Google → OAuth return toast | `?google=` | G page (callback 302 → `/admin/settings/google?google=…`) | toast | — |
| 12.1 | custom → hint/empty/error | `/config/custom` | V «قيم مخصصة» view: caption hint + V empty/error states | — | ro |
| 12.2 | custom → entry row (key, «عامة/خاصة», description, preview) | `custom_config` | V row in the «قيم مخصصة» view (label = description, key in the row menu, tag «عامة» when public) | type-aware editor in the value cell | edit (scalar, sheet) / ro (json, list) |
| 12.3 | custom → «عدّل» | — | inline editor in the value cell; the description line (or the menu) opens «تعديل الوصف» | per-row save | edit (scalar, sheet) |
| 12.4 | custom → «احذف» | `DELETE /config/custom/:key` | V row menu «⋯» → «احذف القيمة…» (custom rows only) | kept: Dialog «نعم، احذفها» (`states.html`) | web |
| 12.5–12.8 | custom → «أضف قيمة», «المفتاح», «القيمة (JSON)», «الوصف» | `PUT /config/custom/:key` | V «أضف قيمة» dialog: key (LTR), type (نص، رقم، نعم/لا، قائمة، JSON), value, required description | validation per type | web |
| 12.9 | custom → «عامة (تُعرض بلا تسجيل دخول)» | `is_public` | V «أضف قيمة» + row tag «عامة» + row menu «اجعلها عامة…» | **ADDED** confirm when made public | web |
| 12.10 | custom → «إلغاء» / «احفظ القيمة» | — | dialog buttons / row «حفظ»/«تراجع» (phone: sheet «احفظ»/«إلغاء») | — | — |

**Check:**
- Ids covered: 8 (0.1–0.8) + 27 (1.1–1.27) + 5 (2.1–2.5) + 4 (3.1–3.4) + 1 (4.1) + 8 (5.1–5.8) + 1 (6.1) + 8 (7.1–7.8) + 1 (8.1) + 1 (9.1) + 33 (10.1–10.33) + 20 (11.1–11.20) + 10 (12.1–12.10) = **127**.
- Controls with no new home: **none**. The SaveBar (0.6) and «حفظ التكاملات» (10.33) are replaced on purpose by per-row and per-card saves.
- Decisions to confirm:
  - 1.16 and 1.19 go to V group «الرسائل» (scalar, independent: CONFIG by docs/26 §1); the «الإشعارات» tab links to them.
  - 10.31–10.32 go to G (next to the redirect URI they belong with); INT keeps a link.
  - The «أضف قيمة» form keeps today's `CUSTOM_KEY_RE` (letters, digits, `_`, `.`, `-`), so existing custom keys stay valid; the store prefixes them `custom.`.

**Added confirmations: 11** rules, on 16 map rows (10 rows, plus 6 rows of secret fields for the overwrite rule).
- The 9 named by the owner: crm cut-over, feedback mode, sales auto assign, recording retention ON, `teachers_always_available`, `meeting_link_auto`, custom public, Google sync off, secret overwrite.
- 2 derived from the IA brief: `activity_retention_days` typed confirm, and the ON confirm for the family-facing «تذكير قبل يوم».
- "Secret overwrite" counts as one rule, applied to every secret on C NUM, C SAFE, INT and G.

### 6b. Mobile endpoints and screens (APK 0.2.0 + OTA)

| # | Endpoint (caller) | Stays | Changes | Alias needed |
|---|---|---|---|---|
| m1 | `GET /settings` (ops screen) | snake_case shape, every key incl. the 3 safety switches | the server may read values from the new store or `notification_rules` | **yes**: after phase 4/7, notification keys (`follow_up_hours`, `reminder_*`, `teacher_whatsapp_*`, `feedback_mode`) are computed from `notification_rules` |
| m2 | `PATCH /settings` (camelCase, changed only) | non-strict schema, 7 hand-edited keys | must check `settings.write` server-side (already 403); the per-row conflict check is not applied to old APKs | **yes**: `followUpHours` writes `follow_up_slots.timing.hours`; the other 6 keys stay CONFIG (no alias) |
| m3 | `GET /settings` → `follow_up_hours.length` (lead qualification) | field name and type `int[]` | — | **yes** (same as m1) |
| m4 | `GET /settings` → `renewal_alert_remaining` (payments) | key stays CONFIG | — | no |
| m5 | `GET /settings/public` (13 consumers) | 8 public keys + `custom` block, snake_case | public «قيم مخصصة» rows still go out in `custom`; descriptions are not added | no (frozen contract; test it) |
| m6 | `GET /admin/google/status` (GoogleSyncCard) | unchanged | the push `google_sync_alert` still opens `/more/ops/settings`; the card moves to the «مزامنة Google» row | no |
| m7 | `GET /admin/notifications` (catalogue) | response fields | additive fields (timing, channels, `essential`, `locked`); the new mobile toggles need a new write endpoint (`PATCH /admin/communications/notifications/:key`) | no (additive only) |
| m8 | `GET /messages/gate` (inbox GateNote) | unchanged | also feeds the C OV send state on mobile | no |
| m9 | `GET /i18n/:locale/overrides` | unchanged | new `ar.json` keys ship in the bundle; overrides still apply | no |

| Mobile screen today | New |
|---|---|
| `/more/ops/settings` «إعدادات الأكاديمية» | Same route (push target), now the list screen «الإعدادات»: «القيم», «التواصل», «مزامنة Google» and the line «التكاملات: تُدار من الموقع» |
| `SettingsFields` (7 keys, one form save) | «القيم» screen: a two-column table (الاسم \| القيمة), one group per view; a tap opens the bottom-sheet editor with per-row save and the same typed confirmations; json/list rows read-only. `follow_up_hours` leaves this screen (old APK keeps it via the m2 alias) |
| `ReadOnlySettings` (3 safety switches) | «التواصل» overview (`more/ops/communications`): send state read-only (messaging, auto, CRM, allow-list) + numbers with health |
| `NotificationCatalogue` (read-only) | «التواصل → الإشعارات»: toggles editable with the same confirmations (family ON, typed «إيقاف» for essential, as a bottom sheet); timing read-only |
| `GoogleSyncCard` (base admin) | «مزامنة Google» read-only card, unchanged (m6) |
| Tests `M/src/ops/*.test.tsx` | Keep the old-APK contract tests for m1–m5; add tests for the list, values and communications screens |

## 7. Design reviews

### 7a. Round 1 (PR #139, stacked layout) — findings and fixes

Four independent reviews of the mockups: Nielsen heuristics, accessibility, brand consistency against docs/07, and
UX copy. The pages were rendered in Chromium at 1440 px and 390 px, in light and dark. All 89 findings were applied to
the mockups, except the four listed under «Not applied».

| Review | Findings | Most severe, and the fix |
|---|---|---|
| **Heuristics** (Nielsen severity 0–4) | 20 (1 sev 4, 6 sev 3) | **sev 4:** module-owned rows were drawn nowhere → group «تُدار من صفحة أخرى» with read-only rows and links.<br>**sev 3, counts:** «42 قيمة» on the hub vs 28 in the design → «28 قيمة · 5 معدَّلة · 8 عامة»; group counts follow docs/26 §1.<br>**sev 3, confirmations:** typed confirmations on booking-wide switches → typed only for data deletion.<br>**sev 3, renewal:** `renewal_alert_remaining` was editable on the notification row → shown by reference.<br>**sev 3, mobile:** catalogue switches looked on while sending was stopped → per-row «لا يُرسل الآن».<br>**sev 3, 390 px:** horizontal scroll on the notifications page → the sidebar becomes a top strip |
| **Accessibility** (WCAG 2.2) | 22 (3 high) | **Focus:** clipped outlines in scrolling strips → block padding / inner offset.<br>**Names:** unnamed brand link at ≤ 900 px; a switch named only «مفعَّل» → names from the row label.<br>**Targets:** selected-tab contrast 2.32:1 → green line; 36 px close buttons, 40 px tabs and inputs → 44 px.<br>**Structure:** several h1 per page → one.<br>**Feedback:** save toasts and field errors announced through polite live regions; the narrow dialog's tab order now matches the visual order |
| **Brand** (docs/07) | 17 (2 high) | **Status tones:** «متوقف» was red on two screens and neutral on the hub → one neutral chip with the struck glyph, because a deliberate pause is not a failure; a rejected template is saffron («دورك»).<br>**Glyphs:** state glyphs on attribute tags («عامة», «أساسي») → plain tags.<br>**Gold:** the double gold rule under group headings → hairline.<br>**Look:** «لم يُحفظ» in green looked clickable → ink-2; boxed cards, monospace keys and green icon tiles removed; one switch design; the real logo PNG.<br>Token hex values match docs/07 §3 exactly |
| **Copy** (MSA) | 30 (6 high) | No dialect was found.<br>**Grammar:** «غيّر سارة» → «غيّرت سارة»; «و2 قيمتان» → «وقيمتان».<br>**Accuracy:** the key hint wrongly forbade `.` and `-`.<br>**Domain words:** «المعلم» → «المعلم/ة»; one label per key on web and mobile.<br>**Reuse ar.json wording:** «قيم مخصصة», «أعد القيمة الافتراضية», «أضف قيمة», «تم حفظ القيمة», «مفعّل / مغلق», the audience and channel names, «يحتاج تأكيد».<br>**Buttons:** imperatives that name the action («أوقف تأكيد الحجز», «أتِح كل المعلمين للحجز») |

**Decisions where reviewers disagreed:**
- **«الإرسال متوقف».** The brand review wanted it neutral; the heuristics review wanted it red. It is neutral with the
  struck glyph, plus a reason line under it.
- **A conflict (409) is saffron.** It is «دورك»: the admin's save waits for their choice. The unsaved state is green.

**Not applied:**
- **Self-hosted fonts:** the mockups may not load external URLs, so they use the font stacks. Production self-hosts the
  fonts (docs/07 §2).
- **Breadcrumb «الإعدادات › التواصل»** stays, because the IA puts «التواصل» under the hub.
- **One fake default** in `values.html` (`teachers_always_available` shown off by default; the code default is on).
  Fixed in round 2: every default now matches docs/26a Part A §1.
- **Long mockup files:** the 150-line rule is for app code, not mockups.

### 7b. Round 2 (owner feedback: tables, short views) — findings and fixes

ROUND2_PLACEHOLDER


## 8. Known limits of the mockups

- The mockups are static and use no script. Switching the group (values) or the audience (notifications) works with
  CSS `:target` links, so the selected tab is also marked statically for the default view; the app uses real
  `aria-current` / `aria-selected` and roving focus. The theme switch uses CSS `:has()`.
- Dialogs, menus, bottom sheets and page states are drawn open in `states.html` as `<figure>` examples; in the app
  they open over a scrim and move focus («إلغاء» first in confirmations).
- `values.html` and `values-390.html` are the same markup (the phone file is the page at 390 px); each value cell
  carries both the desktop editor and the phone button, and a container query shows one.
- Every page shares `tokens.css` (docs/07 §3 values). All data is fake; phone numbers are placeholders
  (`+966 55 000 0000`).
