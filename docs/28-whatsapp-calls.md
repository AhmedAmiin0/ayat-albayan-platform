# 28 — WhatsApp voice calls from the academy chat number

Owner request 2026-10-26: «add calls option», «make the calls option typical to whatsapp». Owner decision:
**only in-app WhatsApp voice calls from the academy chat number, through the Kapso driver**; no `tel:` and no
`wa.me` fallback. Built **dark**: nothing shows and every call route answers 404 until the owner turns on
`whatsapp_calls_enabled` after the steps in §7.

Two PRs: PR 1 `cloud/whatsapp-calls` (API, web, this doc; JS only, no native change) and PR 2
`cloud/whatsapp-calls-mobile` (Expo app with `react-native-webrtc`: **a new APK is required**).

## 1. What it is (and is not)

- WhatsApp Business **Calling** (Meta Cloud API) on the chat number, reached through **Kapso's Meta proxy**
  (the chat line's driver must be `kapso`, docs/19). Signaling (SDP offers/answers and call events) goes
  over HTTPS: our API ↔ Kapso ↔ Meta. **Audio flows directly between Meta and a WebRTC peer that we
  provide**, and that peer is the staff member's own device: the browser's `RTCPeerConnection` on the web,
  `react-native-webrtc` in the Expo app (PR 2). There is **no media server** of ours.
- ICE: STUN from «التكاملات» → «المكالمات الصوتية» (`CALLS_STUN_URLS`, default a public STUN server),
  optional TURN (`CALLS_TURN_URLS`, and its shared secret `CALLS_TURN_SECRET` in Vault: TURN REST / coturn
  `use-auth-secret`; the API mints six-hour per-user credentials, so no device holds a long-lived TURN password).
- Voice only, foreground only. No push notification for an incoming call (a later PR), no recording, no
  transcription, no call from a template button, no group calls.

## 2. Architecture

| Piece | Where | What |
|---|---|---|
| `wa_calls` table | migration `20261026000740_wa_calls.sql` | one row per call: number, phone (E.164), guardian / lead links, direction, status, end reason, Meta call id (wacid), who placed / took it, started / answered / ended (UTC), duration, a short error code. RLS like `messages` (admin; a teacher's families; a salesperson's chats), writes by the API only, in the `supabase_realtime` publication |
| `wa_call_sdp` table | same migration | the offer / answer SDPs (ICE candidates, ice-pwd, DTLS fingerprint), **API only**: RLS on with no policy, no client grant, not in the publication; the API gives an SDP to the call's own parties only |
| State machine | `packages/shared/src/messaging/calls/call-machine.ts` | `connecting → ringing → accepting → active → ended`; statuses only move forward; duplicates, late and out-of-order events are ignored (null patch); every write is compare-and-set on the status read |
| Kapso calls client | `apps/api/src/modules/messaging/calls/kapso/kapso-calls.ts` | `POST /{phone_number_id}/calls` (`connect`, `pre_accept`, `accept`, `reject`, `terminate`) and `GET /{phone_number_id}/call_permissions`, with the chat line's Kapso project key (the same lookup as the Kapso driver: `lineEnvs(loadEnv()).chat`, or the chat number in module mode). **One request per method, never a retry** |
| Webhook | `webhook/parse/webhook.calls.ts` | the existing `POST /webhooks/kapso` (Kapso `meta`-kind webhook) now also reads changes whose field is `calls`: `connect` (an inbound offer, or the answer to our offer), `terminate`, and call `statuses` (RINGING / ACCEPTED / REJECTED). A `calls` change never becomes a message or a delivery tick (no double ingest) |
| Call flows | `calls/flow/*` | outbound start / end, inbound accept / reject, webhook events, permission, the sweeper |
| Routes | `calls/http/*` | §4 |
| Signaling to clients | `GET /calls/active` + Supabase Realtime | a changed `wa_calls` row nudges the signed-in clients (RLS decides who hears it); they re-read through the API, which applies the guards. Realtime carries no data path of its own (the web's Supabase client stays «auth only» for data) |
| Web | `apps/web/src/features/messaging/inbox/calls/` | phone icon, call screens, in-call bar, call entries in the chat, the calls log |

## 3. Flows

### 3.1 Outbound (staff → family)

1. Staff tap the phone icon in a chat header. The client asks `GET /calls/permission/:phone` (Kapso
   `call_permissions`).
   - `granted` (`start_call.can_perform_action`): go on.
   - `request`: no permission, but the **calling number's** 24 h window is open → «اطلب إذن الاتصال» sends an
     interactive `call_permission_request` **through the ordinary outbox and send gate** as a staff send
     (`messages` row with `interactive_payload = {type: 'call_permission_request'}`, dedup key
     `call_permission:<who>:<phone>:<request id>`, audited `call_permission_request`). The family answers in
     WhatsApp; the call can start once Kapso reports the permission.
   - `needs_template`: outside the window only an approved call-permission-request template could ask (owner
     step 4). **We never create or submit templates.**
   - `limited`: WhatsApp refuses both a call and a new request right now.
2. With permission the browser makes the SDP offer (microphone prompt first; a refusal is explained).
3. `POST /calls {phone, sdp, clientRequestId}`: gate → line → scope → allow-list → idempotent request id →
   one live call per staff member → permission → **the row is inserted first** (`connecting`) → **one** Kapso
   `connect` with `biz_opaque_callback_data` = the row id → the wacid is stored. A failed or timed-out connect
   ends the row as `failed` (502 `call_failed` with the code) and is **never retried** (it may already ring and
   business calls are billed).
4. The `connect` webhook brings WhatsApp's SDP answer; the client (polling `/calls/active`, nudged by
   Realtime) applies it. RINGING → «يرنّ…», ACCEPTED → the timer starts, REJECTED / terminate → ended.
5. A hang-up while the connect is in flight ends the row; once WhatsApp names the call the API terminates it.
6. **Unanswered for 45 s** → terminate on WhatsApp and end as `no_answer` (the client ends it at 45 s, and the
   API sweeper does too, every 10 s, so a closed tab never leaves a call ringing).

### 3.2 Inbound (family → academy)

1. The `connect` webhook carries the family's offer → a `ringing` row (deduped by its wacid), only while the
   setting is on and only for the calling number.
2. Every signed-in staff member who may write in that chat (the same guard and scopes as a send: admin,
   sales, the family's teacher; never the teacher's own chat) sees the full-screen incoming call with a
   ringtone (web now, mobile in PR 2; foreground only).
3. A salesperson's Realtime nudge covers their own chats (RLS like `messages`); other chats ring for them through
   the 3 s poll of `/calls/active`. The first «قبول» wins: compare-and-set `ringing → accepting` with `accepted_by`; the device makes the SDP
   answer; the API sends `pre_accept` then `accept`; the row becomes `active` (a failed accept also sends `reject`,
   so the family stops ringing). Every other screen stops ringing
   because the row left `ringing` (a late «قبول» answers 409 `already_taken`).
4. «رفض» → Kapso `reject`, the row ends as `declined` for everyone (as the brief asks; a local «silence» that keeps
   the call ringing for colleagues is a possible follow-up for the owner to decide) (shown as «مكالمة فائتة», like WhatsApp). Hang up →
   `terminate`. A call nobody takes ends as `missed` (Meta's terminate, or the sweeper after 60 s).

### 3.3 Status rules

| Event | From | To |
|---|---|---|
| connect answer (outbound) | any live status, no answer yet (it may come after ACCEPTED) | answer stored |
| RINGING / ACCEPTED / connect for an outbound row we already ended | ended | one best-effort `terminate` (a lost connect answer or a hang-up before WhatsApp named the call never leaves it up) |
| RINGING | connecting | ringing |
| ACCEPTED (outbound) / our accept (inbound) | connecting, ringing / accepting | active |
| REJECTED | connecting / ringing | ended · rejected |
| claim (inbound «قبول») | ringing | accepting |
| terminate | any live | ended · completed (was active) / missed (inbound) / no_answer or failed (outbound) |
| our hang-up | any live | ended · completed / cancelled (outbound) / declined (inbound) |
| anything | ended | ignored (except Meta's talk time, filled once) |

## 4. Routes

All need a login; reads `inbox.read`, actions `inbox.send`; scopes as for sends (`CallAccess`). While
`whatsapp_calls_enabled` is false, every route except `GET /calls/config` answers **404 `calls_disabled`**.

| Route | What |
|---|---|
| `GET /calls/config` | `{enabled, available (chat line on Kapso), canCall, iceServers}`; ICE only to staff who may call |
| `GET /calls/active` | live calls this user's device should show (own call; inbound ringing in a chat they may answer). SDPs only to the parties |
| `GET /calls?phone=&limit=` | the calls log, newest first (a teacher: their families only) |
| `POST /calls` | start (§3.1). 409 `no_permission` / `call_busy`, 403 `recipient_not_allowed`, 503 `calls_unavailable`, 502 `call_failed` |
| `POST /calls/:id/accept` `{sdp}` | take an inbound call. 409 `already_taken` / `call_ended` |
| `POST /calls/:id/reject`, `POST /calls/:id/end` | decline / hang up |
| `GET /calls/permission/:phone`, `POST /calls/permission/:phone/request` | §3.1 step 1 |

`WA_ALLOWED_RECIPIENTS` (the staging guard) applies to calls too: no call to a number outside it. Audit: `wa_call_started`, `wa_call_accepted` (call id, direction, status; never the phone or an SDP), `call_permission_request` (like every send). Logs name the call id and a short code only.

## 5. UX («typical to WhatsApp»)

- A phone icon in the chat header (web; mobile in PR 2), hidden while the setting is off or for roles that
  cannot send in that chat; disabled with the reason while the chat line is not on Kapso.
- Outgoing / in-call screen: big avatar initials, name, «جارٍ الاتصال…» → «يرنّ…» → `m:ss`; كتم, إنهاء
  (red); مكبر الصوت on mobile. Incoming: full screen, قبول (green) / رفض (red). A minimised in-call bar while
  the user works elsewhere.
- Call entries in the chat, merged by time with the messages: «مكالمة صوتية صادرة · 2:14», «مكالمة واردة»,
  «مكالمة فائتة» (red), «لم يُرَدّ», with phone glyphs; tapping one calls back.
- «المكالمات» in the inbox: the calls log, newest first (name, direction glyph, time, duration).
- RTL, existing tokens, MSA strings (`calls.*` in ar.json, en parity).

## 6. Settings

| Key | Where | Default |
|---|---|---|
| `whatsapp_calls_enabled` | «القيم» → الرسائل (simple confirmation); seeded by the config seeder as JSON null = default | **false** |
| `CALLS_STUN_URLS` | «التكاملات» → المكالمات الصوتية (plain) | `stun:stun.l.google.com:19302` |
| `CALLS_TURN_URLS` | same (plain) | unset (no TURN) |
| `CALLS_TURN_SECRET` | same, **Vault** (migration 740 adds it to `integration_secret_key_ok`): the TURN REST shared secret | unset |

No stored value changes on any environment: the migration writes no row, and the seeder never writes a value.

## 7. OWNER STEPS (none of them is done by the PRs)

1. Check that the chat number is **calling-eligible** (a messaging limit of at least 2,000 a day) and turn on
   **Calls** in Kapso › Phone numbers › Settings.
2. Subscribe the number's **meta-kind Kapso webhook** to the **`calls`** field (same receiver URL,
   `<API origin>/webhooks/kapso`).
3. **Fix Meta billing** (error 131042 «payment»): business-initiated calls are billed per 6 seconds.
4. If calls outside the 24 h window are wanted: approve a **call-permission-request template** (not created
   by the platform).
5. After PR 2: install the **new APK** on the staff phones (microphone permission, `react-native-webrtc`).
6. Turn on **`whatsapp_calls_enabled`** in /admin/settings («القيم» → الرسائل).

Rollback: turn the setting off (every route 404, icons gone). The table stays (expand-only); its manual
rollback is at the end of the migration.

## 8. Tests

Unit (vitest, fakes only; no Kapso, Meta or hosted call): the state machine (both directions, duplicates,
out-of-order, ended is final), call entries and merge by time, request bodies; the Kapso client against a
fake fetch (shapes, X-API-Key, one request, errors); outbound (row before connect, never retried,
idempotent, busy, permission, allow-list, teacher scope); inbound (first accept wins, others stop, failed
accept, reject); webhook events and the `calls` parser (no double ingest); the permission states and the
request through the outbox; the sweeper; the HTTP routes (404 while off, role guards, validation); the
migration text. `tools/wa-stub` serves `…/calls` and `…/call_permissions` under `/kapso` and
`POST /__stub/kapso/call` forwards a Kapso-signed calling webhook.

## 9. Mobile (PR 2, `cloud/whatsapp-calls-mobile`: **a new APK is required**)

- **Native change (intentional):**
  - Adds `react-native-webrtc` `124.0.8` and `@config-plugins/react-native-webrtc` `15.0.2`, both pinned exactly. The plugin's 15.x line targets Expo ≥ 56; this app is on SDK 57 / RN 0.86. The newer react-native-webrtc 155.x is under two weeks old.
  - `android.permission.RECORD_AUDIO` is no longer blocked.
  - Every plugin that names the microphone (webrtc, expo-image-picker, expo-audio) carries the MSA rationale `calls.mic.rationale`. A `false` there would block RECORD_AUDIO again (image-picker) or delete the iOS text (expo-audio).
  - `android.permission.SYSTEM_ALERT_WINDOW`, which the webrtc plugin adds, is blocked: voice calls don't draw over other apps.
  - expo-audio still plays only: no recording service, no background playback.
  - **`expo.version` 0.2.0 → 0.3.0**: `runtimeVersion` follows the app version, so an OTA built from this code (it imports the native module) never reaches the 0.2.0 APK.
  - `native-changes.mjs` reports this PR as a native change. Do not publish an OTA from it; build and install the new APK (owner step 5).
- **Where:** `apps/mobile/src/inbox/thread/calls/{api,rtc,state,screen,entries,log}`, the same API routes and state rules as the web.
  - `CallProvider` is mounted once in the root layout for the admin, sales and teacher trees (`StaffCalls`), so an incoming call shows on any screen.
  - The phone icon sits in the chat header. Call entries are merged into the message list; tap one to call back.
  - The inbox has a «المكالمات» pill (admin and sales trees).
- **WebRTC:** the phone is the peer. Android asks for RECORD_AUDIO at call time (`PermissionsAndroid`); iOS asks inside `getUserMedia`. The family's audio plays by itself once its track arrives.
- **Speaker and playback:**
  - «مكبر الصوت» switches expo-audio's mode between earpiece and loudspeaker during a call; react-native-webrtc has no routing API of its own. Mute and speaker chosen before the microphone opens are applied as soon as it does.
  - Outside a call the app runs one deliberate playback mode, set at start and put back after every call (or after a start that failed once it had routed): Android takes audio focus (`doNotMix`, other apps pause, as before), iOS respects the silent switch, loudspeaker, no recording.
  - **Check this on a real device** after installing the APK.
- **Microphone:** asked at call time. A refusal says so. «Don't ask again» offers «افتح الإعدادات» (`Linking.openSettings()`). The native stream is released after every call (`track.stop()` alone keeps it held). react-native-webrtc is loaded lazily, so a binary without it never crashes at boot (calls then say the device does not support them).
- **One full-screen host:** a single Modal switches between the ring and the call (two Modals swapped at once break iOS's presentation). The call notice shows inside it. The minimised bar sits at the top, under the header, so it never covers the newest bubble or the composer.
- **Ring:** foreground only (no push notification in this PR), using a calm repeating vibration. A ringtone file would be a native asset.
- **Known limitation, backgrounding:** the app has no foreground service. Locking the screen or leaving the app mid-call mutes the microphone on Android and suspends the audio on iOS. Back in the foreground, a calm notice says the call may have been silent. Follow-up: an Android foreground service (`FOREGROUND_SERVICE_MICROPHONE` / `_PHONE_CALL`) and iOS VoIP / CallKit.
- **Known follow-ups for a Play Store build** (no native config change in this PR beyond the above): react-native-webrtc's plugin and library also declare `BLUETOOTH`, `WAKE_LOCK` and a `MediaProjectionService` (screen sharing, unused). Review, block or justify them in the Play Console declaration before a store release.
- **Lifecycle:** signing out (the provider goes away) cancels a start in flight and ends a live call on WhatsApp. Calls turned off, or the user losing `inbox.send`, during a call hang it up. A double tap on the phone icon starts one call only.
- **Polling and realtime:** `/calls/active` is polled and the realtime nudge subscribed only while the app is in the foreground.

## 10. A dedicated calls number (owner 2026-10-27, branch `cloud/calls-number`)

Why: Meta's Calling API cannot be turned on for the chat number (…446 on Kapso is also used in the WhatsApp
Business app, «coexistence»; calling needs a Cloud-API-only number and a portfolio messaging limit of at least
2,000). Owner: «oke add the second number». **Inert until a calls number is added**: with none, every path
below is exactly §1–§9 (calls ring on the chat line).

### 10.1 What changes

- **A number role `calls`.** `wa_numbers.purpose` is the `wa_line` enum; migration
  `20261030000983_wa_line_calls.sql` adds the value `calls` (alone: an enum value is unusable in its own
  transaction). In code `WaLine` stays the two messaging lines; `NumberPurpose` (`NUMBER_PURPOSES`) adds `calls`.
  A calls number is **Kapso only** (`callsNeedKapso`: the form says so under «المزوّد», the API answers 409
  `calls_need_kapso` on a create or a PATCH that would break it).
- **callingLine()** (`calls/kapso/calling-line.ts`): the enabled default `calls` number when there is one
  (`common/integrations/calls-number.ts`, loaded by `NumbersConfig` under **both** `comms_source` values, by
  `NumbersQueries.callsDefault()`; a failed read keeps the current one and never fails the numbers refresh), with Kapso's project key; a calls number that cannot carry a call (no WABA
  id, no Kapso key) is `calls_unavailable`, never a silent fall back to the chat line. Else the chat line as
  before. `wa_calls.number_id` stamps the calls number.
- **Inbound.** The Kapso meta webhook routes a change by `metadata.phone_number_id`: under legacy the calls
  number's id is kept (`webhook.lines.ts` `callsReceiving`), in module mode it is a `wa_numbers` row anyway.
  Its `calls` changes reach the same calls flow; a family's message to it lands in their thread stamped
  `line = 'calls'` (and its `number_id`), shown with the word «خط المكالمات» / «Calls line».
- **It never sends a regular message.** Every send path skips it:
  - the sender's queue never reads a `line = 'calls'` row (`SenderQueries.due`);
  - module routing never sees a `calls` number (`messagingNumbers` in `NumberRoutes.pass`: no template, session,
    rule or fallback_rank can pick it), and its `numberEnv` is always null;
  - a template can never be on the calls line (check in migration 984) nor point at it
    (`PUT /messaging/templates/:key/number` → 404 `unknown_number`), nor can a notification rule
    (`PATCH /admin/notifications/:key` → `unknown_number`);
  - a calls inbound never opens a reply window: `v_threads` / `thread_summary_refresh` exclude it from the
    notifications window (migration `20261030000984_calls_number.sql`), `numberWindows` drops it (module
    mode), so the reply line never becomes the calls number; the composer's «window open» and «إعادة فتح»
    follow the messaging windows only (`messagingWindowOpen`); no read receipt is sent for it;
  - the admin's «إعادة المحاولة» refuses a calls-number row (staff tap the button again);
  - a file a family sends to it is fetched with its own Kapso connection only (download, never a send).
- **The one thing it sends: «اطلب إذن الاتصال»**, FROM the calls number, only when a staff member taps it on
  the call sheet (`calls/flow/calls-number-permission.ts`):
  - Kapso `call_permissions` decides `granted` / `limited`; inside the **calls number's own** 24 h window the
    interactive `call_permission_request` (its window: the family's newest message to THAT calls number);
    outside it the approved template named in the setting
    **`calls_permission_template`** («القيم» → الرسائل; `name` or `name:language`, Arabic by default);
    empty = `needs_template` with `via: template`: no button, the sheet says why;
  - the send gate (`messaging_enabled`, WhatsApp configured: `SendGate.open`, 409 `messaging_off`) and
    `WA_ALLOWED_RECIPIENTS` (403) are checked first; a `messages` row (`line = 'calls'`, `number_id`, dedup key
    `call_permission:<who>:<phone>:<request id>`, audited `call_permission_request`) shows it in the thread;
    **one** `POST /{calls phone_number_id}/messages` through Kapso, never retried (a refusal: the row is
    `failed` with the code, 502 `request_failed`). While the request is out the row is `failed` + `sending`,
    never `queued`, so no sender, catch-up or queue count sees it; once WhatsApp took it, a failed write is
    only logged (never a 502 that would invite a second request).
  - The family's answer arrives as an interactive `call_permission_reply`: stored in `wa_call_permissions`
    (API only: RLS on, no policy, no grant) by (phone_number_id, phone) with its expiry; an older answer never
    replaces a newer one. The sheet shows the last answer; `granted` shows the stored expiry when Kapso gives none.

### 10.2 OWNER STEPS (none of them is done by the PR)

1. Get a **SIM that was never registered on WhatsApp** (neither the consumer app nor the Business app).
2. In **Kapso**, add it as a new phone number of the **same WABA** as the chat number (Cloud API only; never
   open it in the WhatsApp Business app).
3. In **WhatsApp Manager**, check that the **portfolio messaging limit is at least 2,000** a day (calling
   eligibility).
4. In Kapso › Phone numbers › the new number › Settings, turn on **Calls**.
5. Subscribe the number's **meta-kind Kapso webhook** to the **`calls`** field (same receiver,
   `<API origin>/webhooks/kapso`; keep `messages` too, for the family's answers).
6. In WhatsApp Manager, create and get approved a **call permission request template** on that WABA, then put
   its name in «القيم» → الرسائل → «قالب طلب إذن الاتصال» (`calls_permission_template`).
7. In **/admin/settings → التواصل → الأرقام**, add the number: purpose **«دور المكالمات»**, provider **Kapso**,
   its phone number id and WABA id; turn it on and make it the default of its role. From then on calls ring on
   it (no APK needed: JS only). To go back, turn it off: calls ring on the chat line again.

Rollback: turn the calls number off (or delete it). Migrations are expand-only; their manual rollback is at
the end of 984 (983's enum value stays, unused).
