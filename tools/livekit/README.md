# LiveKit reference (self-hosted on the VPS, see docs/09 and the owner's memory notes)

Working proof of concept that runs today on the VPS:
- `join.html` — the room page (vanilla JS + vendored `livekit-client` UMD): connect with a token, camera/mic/screen share, mute buttons, duplicate-identity handling, «شغّل الصوت» autoplay fallback.
- `token-server.mjs` — mints join tokens with `node:crypto` (HS256 JWT, claims: `iss`=API key, `sub`=identity, `name`, `nbf`, `exp`, `video:{roomJoin,room,canPublish,canSubscribe,canPublishData}`), no SDK needed.

Server: `wss://livekit-staging.148-230-116-195.sslip.io` (signalling through Caddy; media UDP 7882 / TCP 7881 / TURN UDP 3478). Env names: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (values only on the server and in the owner's secret stores — never in git).
Lesson learned: one token = one identity; opening the same personal link in two windows kicks the first (DUPLICATE_IDENTITY). Lesson links must mint a fresh identity per person/window.

## Moderation («إخراج من الحلقة»)

Every join token carries `metadata = {"role": "<teacher|admin|assistant|sales|guest>"}` (`participantMeta`, @ab/shared), so the room UI knows who may remove whom (`canRemove`: an admin removes anyone but another admin; the lesson's teacher removes guests, assistants and salespeople). Every successful join writes a `classroom_participants` row keyed by the identity (migration 188).

`POST /lessons/:id/room/participants/:identity/remove` (staff login) checks the same rule on the server, writes a `classroom_blocks` row for the login (staff) or the guest link (family), audits `participant_removed`, and calls LiveKit `POST https://<LIVEKIT host>/twirp/livekit.RoomService/RemoveParticipant` with a short-lived server token (`video: {roomAdmin: true, room}`). Later joins of that lesson by the same login / link answer 403 `removed_from_room`. Nothing extra to deploy.

## Screen share for guests («اطلب مشاركة الشاشة»)

A guest token allows `camera` and `microphone` only. A guest asks on the data topic `share-request`; the teacher, an admin or an assistant answers «سماح» → `POST /lessons/:id/room/participants/:identity/share` (or `/meetings/:id/participants/:identity/share`) `{allow}` → `RoomService/UpdateParticipant` with `can_publish_sources` + `SCREEN_SHARE`, `SCREEN_SHARE_AUDIO` (back to camera + microphone on «إيقاف مشاركة», which makes LiveKit unpublish the share). Per session, nothing stored; the same server token as RemoveParticipant (`roomAdmin`). Nothing extra to deploy.

## No text chat in trial lessons (owner decision, 2026-10-11)

«In the trial session, students and teachers cannot chat together; sales or the system manages between them.» The join answer (`POST /lessons/:id/room/join`, `POST /public/join/:linkToken`, `POST /public/student/:token/join`) carries `chat: false` when the lesson's rule has package `trial`, `chat: true` otherwise (internal meetings send nothing: chat open). The web room (the app's «ادخل الحلقة» opens the same web room in the browser) then shows «المحادثة النصية مغلقة في الحلقات التجريبية.», never sends on the data topic `chat` (`CHAT_TOPIC`, @ab/shared) and drops every packet that arrives on it (`dropsChat` in `use-room.ts`). Voice, video, the whiteboard, screen-share requests and moderation are unchanged.

**Client-side only, on purpose.** A LiveKit join token can only allow or refuse ALL data publishing (`canPublishData`); there is no per-topic grant. The whiteboard (`board`) and the guests' requests (`share-request`) are data messages, so turning `canPublishData` off in a trial would break them. The tokens of a trial room therefore keep `canPublishData: true`, and a modified client could still publish on `chat`; no client of ours shows such a packet. (The room has no text chat UI today in any lesson: this guard keeps a future chat panel out of trial rooms.)

## Recording (every room, in full: lessons and internal meetings)

Any join of a lesson or an internal meeting (staff or guest) makes the API create the room (`RoomService/CreateRoom`, so an egress can attach before anyone connects) and start an **audio-only room-composite egress** (`Egress/StartRoomCompositeEgress` with `audio_only: true`, no `layout`, `file_type: MP3`, 64 kbps) that mixes everyone's microphone into one MP3 and uploads it straight to the private Supabase Storage bucket `recordings` at `lessons/<lesson id>/<UTC timestamp>.mp3` or `meetings/<meeting id>/<UTC timestamp>.mp3` (content type `audio/mpeg`, allowed by migration 260). A `lesson_recordings` row (migrations 189, 212: exactly one of `lesson_id` / `meeting_id`) is claimed first; unique partial indexes allow one `recording` row per lesson and per meeting, so concurrent joins start one egress. Through the webhook, an egress that ends while people are still in the room is started again, and the last person leaving stops the running egress (`Egress/StopEgress`). `GET /lessons/:id/recordings` (admin, the lesson's teacher) and `GET /meetings/:id/recordings` (admin, the meeting's creator) list them with 1-hour signed links; `GET /recordings/status` tells the panels whether the server can record at all («التسجيل غير مفعّل على الخادم» otherwise). Everyone in a recorded room sees «جارٍ التسجيل», and the guest join pages say «تُسجَّل هذه الجلسة».

**Audio only (owner decision, 2026-10-06).** The VPS has 2 vCPUs / 7.8 GB shared by LiveKit, the API and the WhatsApp CRM; a video room composite runs one headless Chrome per room (2–4 GB RAM each), so concurrent lessons cannot all be recorded, and teachers review recitation, which is sound. Size: 64 kbps CBR ≈ **29 MB per hour** (≈ 15 MB for a 30-minute lesson) instead of 300–600 MB of 720p video. Format: MP3 plays in every browser we target, iOS Safari of any version included (caniuse `mp3`); OGG/Opus only from iOS 18.4 (caniuse `opus`); MP4/AAC is out because egress forces the `.mp4` extension (an `.m4a` name would be stored as `.m4a.mp4`) and `.mp4` means video for the older rows. Recordings made before the switch stay `.mp4` and keep their video player (`mediaOfPath`, @ab/shared, picks the player by extension).

No Chrome: an audio-only room composite with no `layout` and no `custom_base_url` uses egress's SDK source, which subscribes to the room's audio tracks and mixes them in GStreamer (egress `pkg/config/pipeline.go` `ShouldUseSDKSource`; docs.livekit.io «Leave `layout` and `custom_base_url` parameters unset … Setting either parameter routes the recording through the video pipeline»). Never add a `layout` to the request: it brings Chrome back.

**Before deploying the audio-only API** (a wrong version fails silently: joins still work, every recording row turns `failed`, and the code has no fallback to the video request):
- [ ] `docker exec livekit-server livekit-server --version`: a build from after 2025-09 (protocol #1220 knows `file_type: MP3`; an older server answers the start with 400). Upgrade first if older.
- [ ] The egress image tag (`docker inspect livekit-egress --format '{{.Config.Image}}'`, then its version in `docker logs livekit-egress`): v1.13.0 or newer (older than v1.11 has no MP3; v1.11–v1.12 without `enable_room_composite_sdk_source: true` still launches Chrome). Upgrade first if older.
- [ ] Migration 260 applied to the database **before** the API deploy (else every upload is refused).

Needed on the VPS, next to `livekit-server`:

1. **Redis** — egress talks to the server through it. Add the same Redis to the server's `livekit.yaml`:
   ```yaml
   redis:
     address: 127.0.0.1:6379
   ```
2. **The egress service** (`livekit/egress` Docker image, **v1.13.0 or newer**: MP3 for audio-only came in v1.11.0, its duration/CBR fix and the always-on SDK source for audio-only room composites in v1.13.0; on v1.9–v1.12 add `enable_room_composite_sdk_source: true` to `egress.yaml` or Chrome is still launched. The LiveKit server must be a build from after 2025-09, whose protocol knows `file_type: MP3`). No Chrome, so no 2–4 GB per room: one recording is a GStreamer mixer plus an MP3 encoder. Admission: egress reserves `sdk_audio_room_composite_cpu_cost` (default 1 CPU) for 15 s per start and accepts only up to 80 % of the CPUs, so with the default a second lesson starting within those 15 s on 2 vCPUs is refused (LiveKit answers the start with an error, the row turns `failed`; a later join of that room tries again, but if everyone has already joined none does and that lesson goes unrecorded). Lessons often start on the hour, so the template below lowers the reservation to 0.5 CPU; tune it after `docker stats livekit-egress` during real lessons. `egress.yaml` (placeholders only — real values live on the server, never in git):
   ```yaml
   api_key: <LIVEKIT_API_KEY>
   api_secret: <LIVEKIT_API_SECRET>
   ws_url: ws://127.0.0.1:7880        # the server, reached locally
   redis:
     address: 127.0.0.1:6379
   health_port: 8080
   log_level: info
   cpu_cost:
     sdk_audio_room_composite_cpu_cost: 0.5   # default 1: two lessons starting together on 2 vCPUs
   # Upload target: the API sends the S3 settings with every request, nothing needed here.
   ```
   ```bash
   docker run -d --name livekit-egress --network host --cap-add SYS_ADMIN \
     -e EGRESS_CONFIG_FILE=/etc/egress.yaml -v /opt/livekit/egress.yaml:/etc/egress.yaml \
     livekit/egress:latest
   ```
3. **The webhook** — in `livekit.yaml`, so recordings are marked `done` / `failed` (otherwise they stay `recording`, and no new recording of that lesson starts):
   ```yaml
   webhook:
     api_key: <LIVEKIT_API_KEY>
     urls:
       - https://<api host>/livekit/webhook
   ```
   LiveKit signs each POST (`Authorization`: HS256 JWT with the API secret, claim `sha256` = base64 of sha256(body), content type `application/webhook+json`); the API answers 401 to anything else. `egress_ended` / `egress_updated` with a final status change a row (and restart the recording if people remain); `participant_left` stops the recording of a room that is now empty; every other event is acknowledged and ignored.
4. **API env** (docs/09): `RECORDING_S3_ENDPOINT` (`https://<project>.supabase.co/storage/v1/s3`), `RECORDING_S3_REGION`, `RECORDING_S3_BUCKET=recordings`, `RECORDING_S3_ACCESS_KEY`, `RECORDING_S3_SECRET` (Supabase → Storage → S3 Connection → new access key). All five or none; unset = nothing is recorded and joins work as before.
5. **Upload size** — the `recordings` bucket has no limit of its own; the project's global upload limit (Supabase → Storage → Settings) must stay above the longest room (an hour of audio ≈ 29 MB; a 3-hour meeting ≈ 87 MB). Its allowed types are `video/mp4` (older rows) and `audio/mpeg` (migration 260); without 260 every upload is refused and the rows turn `failed`.

### Recordings in the student file (migration 240)

`GET /students/:id/recordings` (paginated, newest first; admin, the teacher of the lesson or of the currently assigned student, an assigned assistant) lists each lesson recording on every attending student's file with duration, size (from the egress result) and a 1-hour signed link; the web shows it as «تسجيلات الحلقات» on the student profile and on the teacher's student page. `PATCH /recordings/:id/visibility` (admin, the lesson's teacher) sets `visible_to_student` (default false; refused with 409 `recording_group_lesson` when the lesson has more than one student; no student/guardian route and no guardian RLS policy exist yet, the portal task adds both). `GET /students/:id/recorded-lesson-ids` lists the lessons with a finished recording without signing links (the report history uses it). `DELETE /recordings/:id` (admin) removes the file and keeps the row as `deleted`, with an audit row. An hourly job marks rows stuck in `recording` for over 6 hours as `failed` and, **only if** the setting `recording_retention_days` is a positive whole number, deletes the files of older recordings, internal-meeting recordings included; unset = keep forever.

Check: start a lesson as the teacher (or open an internal meeting), then `docker logs livekit-egress` shows the egress; after the last person leaves the row turns `done` and the file is in the bucket.
