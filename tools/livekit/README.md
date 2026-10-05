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

## Recording (every room, in full: lessons and internal meetings)

Any join of a lesson or an internal meeting (staff or guest) makes the API create the room (`RoomService/CreateRoom`, so an egress can attach before anyone connects) and start a **room-composite egress** (`Egress/StartRoomCompositeEgress`, layout `grid`, one MP4) that uploads straight to the private Supabase Storage bucket `recordings` at `lessons/<lesson id>/<UTC timestamp>.mp4` or `meetings/<meeting id>/<UTC timestamp>.mp4`. A `lesson_recordings` row (migrations 189, 212: exactly one of `lesson_id` / `meeting_id`) is claimed first; unique partial indexes allow one `recording` row per lesson and per meeting, so concurrent joins start one egress. Through the webhook, an egress that ends while people are still in the room is started again, and the last person leaving stops the running egress (`Egress/StopEgress`). `GET /lessons/:id/recordings` (admin, the lesson's teacher) and `GET /meetings/:id/recordings` (admin, the meeting's creator) list them with 1-hour signed links; `GET /recordings/status` tells the panels whether the server can record at all («التسجيل غير مفعّل على الخادم» otherwise). Everyone in a recorded room sees «جارٍ التسجيل», and the guest join pages say «تُسجَّل هذه الجلسة».

Needed on the VPS, next to `livekit-server`:

1. **Redis** — egress talks to the server through it. Add the same Redis to the server's `livekit.yaml`:
   ```yaml
   redis:
     address: 127.0.0.1:6379
   ```
2. **The egress service** (`livekit/egress` Docker image, ~2–4 GB RAM per concurrent room-composite recording; Chrome renders the grid). `egress.yaml` (placeholders only — real values live on the server, never in git):
   ```yaml
   api_key: <LIVEKIT_API_KEY>
   api_secret: <LIVEKIT_API_SECRET>
   ws_url: ws://127.0.0.1:7880        # the server, reached locally
   redis:
     address: 127.0.0.1:6379
   health_port: 8080
   log_level: info
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
5. **Upload size** — the `recordings` bucket has no limit of its own; raise the project's global upload limit (Supabase → Storage → Settings) above the longest lesson (an hour of 720p grid ≈ 300–600 MB).

### Recordings in the student file (migration 240)

`GET /students/:id/recordings` (paginated, newest first; admin, the teacher of the lesson or of the currently assigned student, an assigned assistant) lists each lesson recording on every attending student's file with duration, size (from the egress result) and a 1-hour signed link; the web shows it as «تسجيلات الحلقات» on the student profile and on the teacher's student page. `PATCH /recordings/:id/visibility` (admin, the lesson's teacher) sets `visible_to_student` (default false; no student/guardian route exists yet, the RLS policy `lesson_recordings_guardian_read` is ready). `DELETE /recordings/:id` (admin) removes the file and keeps the row as `deleted`, with an audit row. An hourly job marks rows stuck in `recording` for over 6 hours as `failed` and, **only if** the setting `recording_retention_days` is a positive whole number, deletes the files of older recordings; unset = keep forever.

Check: start a lesson as the teacher (or open an internal meeting), then `docker logs livekit-egress` shows the egress; after the last person leaves the row turns `done` and the file is in the bucket.
