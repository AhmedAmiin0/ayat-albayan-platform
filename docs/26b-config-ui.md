# 26b — Settings redesign: UI/UX (information architecture, control map, states, mobile, review)

Companion of `docs/26-config-redesign.md` (architecture, migration, phases, owner questions). Brand: docs/07
(Ink & Gold, green brand tokens, Amiri titles, Plex UI, nuqta status glyphs, one cartouche per screen). Copy: clear
Modern Standard Arabic (CLAUDE.md rule 10); raw key names only as small LTR text. Mockups (static, self-contained,
fake data only): `docs/design/26-config/` — `hub.html`, `values.html`, `values-390.html`, `notifications.html`,
`mobile.html` (shared `tokens.css`).

## 1. Information architecture

```
/admin/settings  «الإعدادات» (hub: search + one tile per destination, each with its live state)
├── /admin/settings/values        «القيم»            the key/value/description store (docs/26 §1 CONFIG + read-only module rows)
├── /admin/communications         «التواصل»          docs/23 §2d: نظرة عامة · الأرقام · الإشعارات · القوالب · الحماية
├── /admin/settings/integrations  «التكاملات»        LiveKit, Expo, Web Push, أسعار الصرف (Vault secrets)
├── /admin/settings/google        «مزامنة Google»    docs/24 (connection, switches, mappings, log)
├── /admin/settings/appearance    «المظهر»           per-device theme (unchanged behaviour)
└── related: /admin/translations «الترجمات» · /admin/roles «الأدوار والصلاحيات» · «سجل النشاط»
```

- **Hub tiles** carry state, not just links: «القيم — 28 قيمة · 5 معدَّلة عن الافتراضي · 8 عامة»; «التواصل —
  الإرسال متوقف» (struck glyph + word); «مزامنة Google — تجربة بدون كتابة»; «التكاملات — 2 بلا قيمة». The hub search
  covers labels, descriptions, keys and module pages, and jumps to the row or tab.
- **Old links keep working** (docs/26 §4 compat): `/admin/settings#integrations` → `/admin/settings/integrations`
  (this also fixes today's non-scrolling anchor, 26a Part D §1.12); the Google OAuth callback and the
  `google_sync_alert` bell link → `/admin/settings/google`; `#settings-messaging` → «التواصل» (until docs/23 phase 6
  the page shows today's messaging section unchanged); `#settings-<group>` → `/admin/settings/values?group=<group>`.
- **Until docs/23 phase 6** «التواصل» is today's messaging section on its own page; phase 6 replaces it with the tabs
  drawn in `notifications.html`.

## 2. «القيم» — the key/value/description page

- **Toolbar:** search («ابحث بالاسم أو الوصف أو المفتاح»), group index (desktop: a fihris; 390px: a scrolling chip
  strip): الكل، الجدول والحلقات، الحلقات عبر الإنترنت، التقارير، الحسابات والدفعات، مستحقات المعلمين، الملفات
  المرفوعة، الأكاديمية، الرسائل، المبيعات، السجلات والاحتفاظ، قيم مضافة، تُدار من صفحة أخرى; filters «المعدَّلة فقط»,
  «العامة فقط».
- **Row:** label (Plex 600) · stored description (ink-2, «تعديل الوصف») · type-aware editor (number with unit and
  bounds «من 1 إلى 12», switch, choice, time zone, phone in E.164 inside `<bdi dir="ltr">`, text, list of numbers,
  a small fieldset for a fixed shape, a switch + number for a nullable value such as late cancellation) · «الافتراضي:
  4» + «إعادة للافتراضي» (only when different) · «آخر تعديل: 21 أكتوبر 14:05 · أحمد» · badges «معدَّلة», «عامة»
  (visible before login), «يؤثر في الأسر» where `reachesFamilies` · the key in 12px LTR ink-3.
- **One save model:** each row saves on its own (`PATCH /config/entries/:key` with its `version`). Editing marks the
  row (green inline-start rule + «لم يُحفظ») and shows «حفظ» (secondary) + «تراجع» (ghost); leaving the page with
  unsaved rows asks first. Saffron is never used for this: it means «دورك» only (docs/07 §1).
- **Confirmations** come from the registry (`confirm`): plain dialog for booking-wide switches
  (`teachers_always_available`, `meeting_link_auto`, `sales_auto_assign`); **typed** for values that delete data
  (`recording_retention_days`, `activity_retention_days`: type the number of days). The server re-checks typed
  confirmations (428).
- **Module-owned rows** (filter «تُدار من صفحة أخرى»): value read-only + «تُعدَّل من صفحة التواصل» link.
- **«قيم مضافة»** (docs/26 phase 5): «إضافة قيمة» — key (LTR), type (نص، رقم، نعم/لا، قائمة، JSON), value,
  description (required), «عامة؟» (confirmation: «ستظهر هذه القيمة لأي زائر قبل تسجيل الدخول»); delete keeps its dialog.

### States (every page of the hub follows them)

| State | Rendering |
|---|---|
| Loading | skeleton rows of the real row height; the toolbar is usable |
| Empty search | «لا توجد قيم تطابق بحثك» + «مسح البحث» (docs/07 §10) |
| Load error | inline alert (struck glyph) «تعذّر تحميل القيم» + «أعد المحاولة»; nothing editable |
| Read-only (no `settings.write`) | chip «للاطلاع فقط» under the title; values as text; no buttons (today every control renders and the save fails with 403) |
| Dirty | per row, as above; a count «3 قيم لم تُحفظ» in the running head |
| Saving | the row's «حفظ» reads «جارٍ الحفظ…» and is disabled; other rows stay editable |
| Saved | toast «حُفظت القيمة» with «تراجع» (5 s) |
| Validation | field error under the editor, struck glyph, linked by `aria-describedby`: «القيمة يجب أن تكون بين 1 و12» |
| Conflict (409) | inline alert in the row: «غيّرت سارة هذه القيمة إلى 6 قبل دقيقتين. قيمتك: 8.» + «احفظ قيمتي» / «اعتمد القيمة الجديدة» |
| Owned by a module (409) | not reachable from the UI (read-only rows); the API answer is shown as a plain error if it happens |

## 3. Module pages

- **التواصل → الإشعارات** (`notifications.html`): a state strip always visible («إرسال الرسائل: متوقف» with the
  plain sentence why, «الرسائل التلقائية», queued count); the catalogue grouped by audience (ولي الأمر، المعلم/ة،
  العميل المحتمل، فريق العمل); per row: name, timing editor (times are selects, never typed), channels, number,
  template status, the effective state or the first blocker in words, the switch. Essential rows (booking
  confirmation, report PDF) turn off only with a typed «إيقاف» and an activity-log entry (docs/23 owner answer 3);
  locked rows (`reminder_failed`) say «لا يمكن إيقافه»; switching on a family-facing row says whom it reaches.
  `renewal_due` shows `renewal_alert_remaining` by reference with a link to «القيم».
- **التكاملات**: one card per service, one «حفظ» per card; secrets write-only, a confirmation when a save replaces a
  stored secret, clearing keeps its dialog; the WhatsApp and Kapso groups move to «التواصل» (docs/23 phase 3/6).
- **مزامنة Google**: today's cards on their own page; «أوقف المزامنة» gains a confirmation.
- **المظهر**: unchanged (per device).

## 4. Mobile admin (Expo)

`/more/ops/settings` stays (push deep links open it) and becomes the list «الإعدادات»: «القيم» (editable with
`settings.write`: scalars with per-row save and the same confirmations; lists and small forms read-only «عدّلها من
الموقع»), «التواصل» (send state read-only; catalogue switches editable with the same confirmations; numbers,
credentials and templates «تُدار من الموقع»), «مزامنة Google» (read-only card, unchanged), «التكاملات: تُدار من
الموقع». No frame, no cartouche; nuqta, green and saffron stay (docs/07 §12); inputs 16px and ≥ 44px tall.

## 5. UX rationale (short)

1. **One page per question.** «What is this value and what does it do?» → «القيم» (the description sits next to the
   value). «What is sent, when, from which number?» → «التواصل». Today both questions need five sections of one page.
2. **One save model per page.** Today's page has five save paths and one «حفظ» that sends every field, silently
   undoing another admin's change (26a Part D §5). Per-row saves with a version check make conflicts visible.
3. **State on the hub.** The owner sees «الإرسال متوقف» before opening anything; dangerous state is never hidden
   behind a link.
4. **Danger is declared in data.** `confirm` and `reachesFamilies` live in the registry, so web and mobile ask the
   same question, and the server enforces typed confirmations.
5. **Plain words.** Arabic labels and descriptions first; key names only as small LTR developer text.

## 6. Old → new control map (all 127 controls of today's page; ids = 26a Part D §1)

Abbreviations:
- V = «القيم» `/admin/settings/values`, followed by the group.
- C = «التواصل» `/admin/communications`, followed by the tab: OV نظرة عامة, NUM الأرقام, NOT الإشعارات, TPL القوالب, SAFE الحماية والتجربة. TOP is the strip that is always visible.
- INT = «التكاملات» `/admin/settings/integrations`.
- G = «مزامنة Google» `/admin/settings/google`.
- AP = «المظهر» `/admin/settings/appearance`.
- HUB = `/admin/settings`.

How rows in V save: each row saves on its own, with «حفظ» and «تراجع». A row edited by someone else shows the conflict alert.

Mobile column: **edit** = editable on the new Expo screen with `settings.write`; **ro** = read-only; **web** = web-only, with the note «افتح في الموقع» or «عدّلها من الموقع».

**ADDED** marks a confirmation that does not exist today.

### 6a. Web controls

| # | Today: section → control | Key / store | New home | Editor + confirmation (new) | Mobile |
|---|---|---|---|---|---|
| 0.1 | chrome → title «الإعدادات» | — | HUB cartouche «الإعدادات»; each page has its own title | — | ro (list screen title) |
| 0.2 | chrome → index «أقسام الإعدادات» (11 anchors) | — | HUB tiles (V, C, INT, G, AP) + «روابط ذات صلة»; V fihris of groups; old `#settings-<id>` anchors redirect | nav | list screen |
| 0.3 | chrome → search «ابحث في الإعدادات» | client filter | HUB global search (labels, descriptions, keys, module pages) + V toolbar search «ابحث بالاسم أو الوصف أو المفتاح» | search; empty state «لا توجد قيم تطابق بحثك» + «مسح البحث» | edit (V search) |
| 0.4 | chrome → load states | `GET /settings` | every page: skeleton rows + inline alert «أعد المحاولة» | — | same |
| 0.5 | chrome → toast «تم حفظ الإعدادات» | — | per-row toast «حُفظت القيمة»; module toasts kept | — | same |
| 0.6 | chrome → SaveBar «حفظ» (whole form PATCH) | all FORM_KEYS | **removed**: replaced by per-row «حفظ»/«تراجع» in V; asks before leaving with unsaved rows | per-row save; conflict alert «احفظ قيمتي / اعتمد القيمة الجديدة» | edit (per row; old APK keeps its form save via m2) |
| 0.7 | chrome → «أعد القيمة الافتراضية» | default | V row ghost «إعادة للافتراضي» + «الافتراضي: …» | saves like any edit | edit |
| 0.8 | chrome → «معدَّل», «آخر تعديل: … بواسطة …» | `/config/meta` | V row badge «معدَّلة» + meta line «آخر تعديل: … · name»; chip «المعدَّلة فقط» | — | ro meta |
| 1.1 | messaging → DangerFrame «إعداد حساس…» | — | C TOP strip + SAFE tab framing | — | ro |
| 1.2–1.3 | messaging → «نقلنا الرقم من الـCRM» / «أعد التحذير» | `crm_cutover_done` | C SAFE «CRM cut-over»; warning repeated on OV and in the sending confirmation | button + **ADDED** confirm both ways (dialog, cancel focused) | ro (shown on OV) |
| 1.4 | messaging → «إرسال الرسائل» | `messaging_enabled` | C TOP + OV master switch | kept: ConfirmSwitchDialog both ways (queued count, CRM warning) | ro (send state) |
| 1.5 | messaging → server gate note | `GET /messages/gate` | C TOP («متوقف/يعمل», queued count) + OV gate in words | — | ro |
| 1.6 | messaging → «الرسائل التلقائية…» | `auto_messages_enabled` | C TOP + OV second master switch | kept: ConfirmSwitchDialog both ways | ro |
| 1.7 | messaging → «بعد انتهاء الحلقة» buttons/link | `feedback_mode` → `notification_rules.lesson_rating.enabled` | C NOT row «تقييم الحلقة» (ولي الأمر) | toggle + **ADDED** confirm (ON: «سيصل إلى N ولي أمر»; OFF: dialog) | edit (catalogue toggle) |
| 1.8–1.9 | messaging → «خطوط واتساب», «افحص الخطوط», line rows | lines check, `wa_line_health` | C NUM one card per number with «افحص الآن» + «تفاصيل تقنية»; health glyph on OV | button, no confirm (read-only Meta call) | ro (OV cards); check is web-only |
| 1.10 | messaging → «ماذا يُرسل ومتى» (read-only, 25 rows) | `GET /admin/notifications` | C OV table (ro) + C NOT the catalogue, now editable | rows grouped by audience; essential rows off need a typed «اكتب: إيقاف»; locked rows | edit (toggles), ro (timing) |
| 1.11 | messaging → «تذكير الحلقة قبلها بكم دقيقة» | `reminder_minutes_before` → `lesson_reminder.timing.minutes_before` | C NOT row «تذكير الحلقة» (ولي الأمر) | timing «قبل الحلقة بـ [60] دقيقة», bounds 5–720 | ro timing |
| 1.12 | messaging → «تذكير قبل الحلقة بيوم» | `reminder_24h_enabled` → `lesson_reminder_24h.enabled` | C NOT row «تذكير قبل يوم» (+ «اليوم السابق الساعة [20:00]») | toggle; **ADDED** family-facing ON confirm («سيصل إلى…»), from the IA rule | edit |
| 1.13–1.14 | messaging → «رسالة واتساب للمعلم/ة عند حجز طالب جديد», «تذكير المعلم/ة بالحلقة» | `teacher_whatsapp_*` → `teacher_new_student` / `teacher_lesson_reminder`.enabled | C NOT rows (المعلم) | toggle + channels; no confirm (teacher-facing) | edit |
| 1.15 | messaging → «المتابعة بعد كم ساعة من آخر رسالة» | `follow_up_hours` → `follow_up_slots.timing.hours` (leads also reads it) | C NOT row «متابعة العميل المحتمل» (العميل المحتمل) | list of numbers, ascending, ≤5 | ro on the new screen; old APK edits it via m2 alias |
| 1.16 | messaging → «مدى البحث عن الحلقات القادمة للتذكير» | `reminder_lookahead_hours` | V «الرسائل» (CONFIG: one scalar engine parameter; the «الإشعارات» tab links to it) | number 25–72 | edit |
| 1.17–1.18 | messaging → «أقرب موعد يُقترح…», «أبعد موعد يُقترح…» | `follow_up_slots_from_hours`, `_to_days` | C NOT row «متابعة العميل المحتمل», extra timing fields | numbers 1–168 / 1–30 | ro |
| 1.19 | messaging → «يُعتمد رد «نعم» المكتوب خلال كم ساعة» | `quick_reply_window_hours` | V «الرسائل» (CONFIG; may become a per-number value in docs/23 phase 5) | number 1–168 | edit |
| 1.20–1.21 | messaging → «قوالب واتساب» header, «القوالب حسب الرقم» | `/messaging/templates(/lines)` | C TPL (moved unchanged, now under a tab heading) | — | web |
| 1.22 | messaging → «مزامنة مع Meta» per line | `POST …/templates/health` | C TPL per-number block | button; no confirm (kept) | web |
| 1.23–1.24 | messaging → template table, «متاح للمعلمين والمبيعات» | `message_templates` | C TPL table + starter switch | kept as is (self-save) | web (picker keeps reading templates) |
| 1.25–1.26 | messaging → «أرسله إلى ميتا للاعتماد», «نقل إلى الرقم الآخر» | templates submit/line | C TPL; "move" becomes "choose number" in phase 5 | kept: Submit/Move dialogs | web |
| 1.27 | messaging → template toasts | — | C TPL toasts | — | — |
| 2.1 | schedule → «تُجدول الحلقات لكم أسبوعًا مقدمًا» | `booking_horizon_weeks` | V «الجدول والحلقات» | number 1–12 | edit |
| 2.2–2.3 | schedule → «حساب الإلغاء المتأخر» + hours | `late_cancel_hours` (nullable) | V «الجدول والحلقات», **one row** (switch + number) | switch + number 1–168 | edit |
| 2.4 | schedule → «يمكن تعويض الحلقة الفائتة خلال كم يومًا» | `makeup_window_days` (public) | V «الجدول والحلقات», badge «عامة» | number 1–365 | edit |
| 2.5 | schedule → «كل المعلمين متاحون للحجز…» | `teachers_always_available` | V «الجدول والحلقات», note «يؤثر في …» | switch + **ADDED** typed confirm «تأكيد» | edit (same typed confirm) |
| 3.1–3.3 | classroom → «تُفتح الحلقة قبل…», «تُغلق…», «عنوان الاجتماع الداخلي» | `join_opens_before_min`, `join_closes_after_min` (public), `default_meeting_title` | V «الحلقات عبر الإنترنت» | numbers / text 1–60 | edit |
| 3.4 | classroom → «الوضع الافتراضي: الحلقات عبر منصة الأكاديمية» | `meeting_link_auto` (public; default for `teachers.meeting_mode`) | V «الحلقات عبر الإنترنت», note «يؤثر في …» | switch + **ADDED** typed confirm «تأكيد» | edit (same) |
| 4.1 | reports → «يمكن للمعلم/ة تعديل التقرير حتى كم ساعة» | `report_teacher_edit_hours` | V «التقارير» | number 0–168 | edit |
| 5.1 | accounts → «عملة الأرقام في لوحة التحكم» | `reporting_currency` | V «الحسابات والدفعات» | select (ISO list; an unknown stored code is kept) | edit (select replaces free text) |
| 5.2 | accounts → «نبّه للتجديد عندما يتبقى…» | `renewal_alert_remaining` | V «الحسابات والدفعات», **stays CONFIG** (SQL `v_student_list` reads it); C NOT row «تجديد الباقة» shows it **by reference** («من القيم» + link) | number 0–10 | edit |
| 5.3–5.4 | accounts → «يُعدّ الاشتراك منتهيًا…», «علّم الحلقات القادمة…» | `subscription_expiry_days`, `flag_future_lessons_when_unpaid` | V «الحسابات والدفعات» | number / switch | edit |
| 5.5–5.7 | accounts → «تُحسب الحلقة التي تأخر…/غاب…/التجريبية…» | `payout_count_late/_no_show/_trials` (SQL readers) | V «مستحقات المعلمين» (new group) | switches | edit |
| 5.8 | accounts → «يُعاد استخدام سعر الصرف…» | `fx_fresh_hours` | V «الحسابات والدفعات» | number 1–168 | edit |
| 6.1 | uploads → «الحد الأقصى لحجم الملف…» | `upload_max_mb` (public) | V «الملفات المرفوعة» | number 1–10 | edit |
| 7.1 | academy → «رقم واتساب الأكاديمية» | `academy_whatsapp_e164` (public) | V «الأكاديمية» (edited here) + C OV read-only «الرقم المعلن للأسر» | phone E.164, LTR | edit |
| 7.2–7.3 | academy → «المنطقة الزمنية للأكاديمية», «مدة حدّ الطلبات في استمارة الرأي» | `academy_timezone`, `feedback_rate_window_min` | V «الأكاديمية» | tz select / number 1–120 | edit |
| 7.4–7.5 | academy → «بيانات تواصل الأكاديمية», «إشعار الموافقة على التسجيل» | `academy_contact`, `recording_consent_notice` (json, public) | V «الأكاديمية» | small fieldset (json shape) | ro «عدّلها من الموقع» |
| 7.6–7.7 | academy → «حذف التسجيلات بعد مدة» + days | `recording_retention_days` (nullable) | V «السجلات والاحتفاظ», **one row**, note «يؤثر في …» | switch + number; **ADDED** typed confirm (type the number of days) on ON and when the value is shortened | edit (same) |
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
| 11.7 | Google → «شغّل المزامنة» | `google_sync_enabled` | G switches card; HUB tile chip | kept: Dialog / LiveConfirmDialog | ro |
| 11.8 | Google → «أوقف المزامنة» | `google_sync_enabled` = false | G switches card | **ADDED** confirm dialog (stops calendar/Drive writes) | ro |
| 11.9 | Google → «تجربة بدون كتابة / كتابة فعلية» | `google_sync_mode` | G switches card; HUB tile «تجربة بدون كتابة/متصل» | kept: LiveConfirmDialog toward live | ro |
| 11.10 | Google → «نطاق التقويم بالأيام» + «حفظ النطاق» | `google_calendar_window_days` | G switches card (MODULE, not V) | number 7–180, own save | ro |
| 11.11–11.13 | Google → «ابحث في Google», folder/sheet, «تأكيد المجلد والجدول» | `/admin/google/drive` | G «Drive والجداول» card | unchanged | web |
| 11.14 | Google → teacher ↔ calendar map | `/admin/google/teachers` | G «المعلمون والتقاويم» | unchanged | web |
| 11.15–11.17 | Google → student search, row actions, manual link | `/admin/google/students` | G «الطلاب والمجلدات» | unchanged (unmap still has no confirm; candidate) | web |
| 11.18–11.19 | Google → «سجل المزامنة», «زامن الآن», «إعادة المحاولة» | reconcile/items | G «سجل المزامنة» | unchanged | ro (last error on card) |
| 11.20 | Google → OAuth return toast | `?google=` | G page (callback 302 → `/admin/settings/google?google=…`) | toast | — |
| 12.1 | custom → hint/empty/error | `/config/custom` | V «قيم مضافة»: group intro + V empty/error states | — | ro |
| 12.2 | custom → entry row (key, «عامة/خاصة», description, preview) | `custom_config` | V row in «قيم مضافة» (label = description, key LTR, badge «عامة») | type-aware editor | edit (scalar) / ro (json, list) |
| 12.3 | custom → «عدّل» | — | inline row editor + «تعديل الوصف» | per-row save | edit (scalar) |
| 12.4 | custom → «احذف» | `DELETE /config/custom/:key` | V row menu «حذف» (custom rows only) | kept: Dialog «نعم، احذفها» | web |
| 12.5–12.8 | custom → «أضف قيمة», «المفتاح», «القيمة (JSON)», «الوصف» | `PUT /config/custom/:key` | V «إضافة قيمة» dialog: key (LTR), type (نص، رقم، نعم/لا، قائمة، JSON), value, required description | validation per type | web |
| 12.9 | custom → «عامة (تُعرض بلا تسجيل دخول)» | `is_public` | V «إضافة قيمة» + row badge | **ADDED** confirm when made public | web |
| 12.10 | custom → «إلغاء» / «احفظ القيمة» | — | dialog buttons / row «حفظ»/«تراجع» | — | — |

**Check:**
- Ids covered: 8 (0.1–0.8) + 27 (1.1–1.27) + 5 (2.1–2.5) + 4 (3.1–3.4) + 1 (4.1) + 8 (5.1–5.8) + 1 (6.1) + 8 (7.1–7.8) + 1 (8.1) + 1 (9.1) + 33 (10.1–10.33) + 20 (11.1–11.20) + 10 (12.1–12.10) = **127**.
- Controls with no new home: **none**. The SaveBar (0.6) and «حفظ التكاملات» (10.33) are replaced on purpose by per-row and per-card saves.
- Decisions to confirm:
  - 1.16 and 1.19 go to V group «الرسائل» (scalar, independent: CONFIG by docs/26 §1); the «الإشعارات» tab links to them.
  - 10.31–10.32 go to G (next to the redirect URI they belong with); INT keeps a link.
  - The «إضافة قيمة» form keeps today's `CUSTOM_KEY_RE` (letters, digits, `_`, `.`, `-`), so existing custom keys stay valid; the store prefixes them `custom.`.

**Added confirmations: 11**, on 10 controls.
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
| m5 | `GET /settings/public` (13 consumers) | 8 public keys + `custom` block, snake_case | public «قيم مضافة» rows still go out in `custom`; descriptions are not added | no (frozen contract; test it) |
| m6 | `GET /admin/google/status` (GoogleSyncCard) | unchanged | the push `google_sync_alert` still opens `/more/ops/settings`; the card moves to the «مزامنة Google» row | no |
| m7 | `GET /admin/notifications` (catalogue) | response fields | additive fields (timing, channels, `essential`, `locked`); the new mobile toggles need a new write endpoint (`PATCH /admin/communications/notifications/:key`) | no (additive only) |
| m8 | `GET /messages/gate` (inbox GateNote) | unchanged | also feeds the C OV send state on mobile | no |
| m9 | `GET /i18n/:locale/overrides` | unchanged | new `ar.json` keys ship in the bundle; overrides still apply | no |

| Mobile screen today | New |
|---|---|
| `/more/ops/settings` «إعدادات الأكاديمية» | Same route (push target), now the list screen «الإعدادات»: «القيم», «التواصل», «مزامنة Google» and the line «التكاملات: تُدار من الموقع» |
| `SettingsFields` (7 keys, one form save) | «القيم» screen: every CONFIG row, per-row save, same typed confirmations; json/list rows read-only. `follow_up_hours` leaves this screen (old APK keeps it via the m2 alias) |
| `ReadOnlySettings` (3 safety switches) | «التواصل» overview (`more/ops/communications`): send state read-only (messaging, auto, CRM, allow-list) + numbers with health |
| `NotificationCatalogue` (read-only) | «التواصل → الإشعارات»: toggles editable with the same confirmations (family ON, typed «إيقاف» for essential); timing read-only |
| `GoogleSyncCard` (base admin) | «مزامنة Google» read-only card, unchanged (m6) |
| Tests `M/src/ops/*.test.tsx` | Keep the old-APK contract tests for m1–m5; add tests for the list, values and communications screens |
