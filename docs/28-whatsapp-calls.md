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
