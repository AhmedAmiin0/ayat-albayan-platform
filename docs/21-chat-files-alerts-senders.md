# Chat files, owner alerts, sender names: build spec (owner decisions 2026-10-19)

Owner 2026-10-19, after the web chat for the assistant (#123, #125): four decisions, all built here as ONE routine. Design workflow wf_9e51dd13-6ef (4 code maps + a completeness critic). The spec below was written before the owner's last answers: **the overrides in this first section win over anything below.**

## Owner answers (2026-10-19), overriding the spec

1. **Phone: build a NEW APK now so voice notes and videos play INSIDE the chat** (not «open in the phone's player»). Add `expo-audio` (playback only: its config plugin with `microphonePermission: false`; no recording) and `expo-video` with versions from `npx expo install` for SDK 57, and since a new APK is built anyway, `expo-document-picker` so the assistant can also send **PDFs** from the phone (§5 mobile: images AND PDFs). Bump `expo.version` in `apps/mobile/app.json` from `0.1.0` to `0.2.0` (runtimeVersion policy `appVersion`: the new APK gets runtime 0.2.0; phones on the old APK stop receiving OTAs until they install it). Never re-add `forcesRTL`. `tools/scripts/ci-checks/native-changes.mjs` will report the native change: expected. §4 Mobile becomes inline players (audio: play/pause + progress + duration; video: inline player with native controls), loaded lazily on tap through the same file route; §10's «inline playback / PDFs from mobile» items are IN scope; §12/§13: after merge and the staging deploy, the release is a new APK (`mobile` workflow `build-android-apk`), not an OTA.
2. **30-day deletion: ONLY voice notes and videos.** The purge job deletes stored inbound **audio/video** files 30 days after the family sent them. Photos and PDFs stay exactly as today (never purged); nothing that already exists other than audio/video is deleted. Wherever the spec says the 30-day purge covers all inbound chat files, restrict it to `PLAYABLE_MIMES`.
3. **New-lead alerts go to EVERY assistant** (as the spec builds it); a chat of a family owned by an assistant alerts only that assistant; unowned chats go to all assistants; admins unchanged.
4. **Teachers see staff names** on academy messages in their own family chats (the same names everyone sees).
5. Teachers do NOT send files (spec default: 403 `files_forbidden`).

## As built (2026-10-19): what differs from the spec below

- **Purge:** `WaMediaRetentionJob` deletes only stored inbound files whose mime is in `PLAYABLE_MIMES` (voice notes, videos), not every inbound kind (§4 item 6, §11 row 1). Photos and PDFs are never purged.
- **Mobile:** voice notes and videos play inline in the chat (expo-audio play/pause + progress + duration; expo-video with native controls), loaded on tap through W6; the assistant sends images **and PDFs** (expo-document-picker). Replaces §4 item 9's `Linking.openURL` and §5 item 16's «images only».
- **Release:** a new APK, version 0.2.0 (runtime 0.2.0), built with the `mobile` workflow `build-android-apk` after merge; not an OTA (§0 Mobile bullet, §12, §13 superseded). Phones on the 0.1.x APK get no OTA until they install it.
- **e2e:** the Kapso file send is checked on `stubSent()` (`via: 'kapso'`, `type: 'image'`, `image.link`) plus `stubRequests()` (every send carried `X-API-Key`), since the request log holds no bodies.

# Build spec: chat media, sending files, owner alerts, sender names (owner decisions 2026-10-19)

One cloud routine, one branch `cloud/chat-files-alerts-senders`, one PR into `develop`. It is based on `origin/develop`, which is 8482d10a or later and includes PR #123.
Requirement IDs covered: R-MSG-03, R-MSG-04, R-MSG-05, R-MSG-06, R-NOT-01, R-MOB-01, R-LEAD-01.

## 0. Rules and preconditions

- **Code rules:**
  - Max 150 lines per file. Several touched files are close to the limit: `whatsapp.client.ts` 145, `thread-send.service.ts` 118, `webhook.queries.ts` 130, `views.ts` 126 and `push.service.ts` 105. TextComposer.tsx and web `api.ts` cannot grow at all.
  - Max 3 parameters per function. This includes constructors: `@typescript-eslint/max-params`.
  - Strict TS: no `any` and no `!`.
  - Each new file gets a `*.test.ts(x)` next to it.
  - Arabic strings are MSA in `packages/shared/i18n/ar.json`, with matching keys in `en.json` (the shared `i18n.test.ts` checks key parity).
  - Jobs are idempotent and RLS stays on every table.
  - Two WhatsApp drivers, set per line (`meta|kapso`, docs/19).
- **Precondition: `origin/fix/chat-round3` must be merged first.** The routine checks this before anything else: `git show origin/develop:apps/web/src/features/messaging/inbox/composer/lib/send-start.ts`. If the file is absent, the routine stops and reports. It does not copy the file in. FileComposer uses `sendStart()` and `settleOwnSend()` from it, and that branch also edits `TextComposer.tsx` and `docs/20`.
- **WhatsApp in tests:** only `tools/wa-stub`. Never call the real Meta number, the Kapso number +966536900446, or real families.
- **Mobile:** JS-only, shipped by OTA. Do **not** add `expo-audio`, `expo-video` or `expo-document-picker`. `app.json` uses `runtimeVersion.policy: appVersion`, so a native dependency added without a new APK would crash the installed app.
- **Running checks:** never run anything on the owner's PC. Run `pnpm turbo lint typecheck test` and `e2e` in the routine's sandbox or GitHub Actions. CI must be green.
- **Work order** (each step compiles on its own):
  1. §1 shared changes
  2. §2 migrations and types
  3. D4 sender names
  4. D1 voice and video
  5. D2 sending files
  6. D3 alerts
  7. docs
  8. PR

## 1. Shared changes (do these first)

### 1.1 `packages/shared/src/schemas/chat-media.ts` (new, plus `chat-media.test.ts`; exported from `schemas/index.ts`)

```ts
export const PLAYABLE_MIMES = ['audio/ogg','audio/mpeg','audio/mp4','audio/aac','audio/amr','video/mp4','video/3gpp'] as const;
export const PLAYABLE_MAX_BYTES = 16 * 1024 * 1024;
/** What a chat bubble may open: images/PDF (INVOICE_MIMES) + audio/video. */
export const CHAT_VIEW_MIMES = [...INVOICE_MIMES, ...PLAYABLE_MIMES] as const;
export const baseMime = (mime: string | null): string => mime?.split(';')[0]?.trim().toLowerCase() ?? '';
export const isChatViewMime = (m: string | null): boolean => …;
export const isPlayableMime = (m: string | null): boolean => …;
export const chatFileMaxBytes = (m: string | null): number => isPlayableMime(m) ? PLAYABLE_MAX_BYTES : INVOICE_MAX_BYTES;
```

- `INVOICE_*` and `RECEIPT_*` stay as they are. They are test-locked to each other.
- `apps/api/src/modules/messaging/whatsapp/messages/inbound-media.service.ts` re-exports `baseMime` from `@ab/shared` instead of defining it. The imports in `thread-media.service.ts` and `booking.invoice.ts` stay unchanged.
- `apps/web/src/features/messaging/inbox/messages/components/MessageMedia.tsx` drops its local `baseMime`.

### 1.2 `packages/shared/src/messaging/chat/chat-files.ts` (new, plus `chat-files.test.ts`; exported from `messaging/index.ts`)

```ts
import { baseMime } from '../schemas/chat-media';
export const CHAT_SEND_MIMES = ['image/jpeg','image/png','application/pdf'] as const; // Meta `image` = jpeg/png only
export const WA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;   // Meta image limit
export const WA_CAPTION_MAX = 1024;
export const waMediaKind = (mime: string | null): 'image' | 'document' => …; // pdf → document
export function chatFileProblem(f: { mime: string; size: number; maxBytes: number }): 'file_type' | 'file_too_large' | null;
// images: min(WA_IMAGE_MAX_BYTES, maxBytes); PDF: maxBytes (= uploadMaxBytes(settings), default 10 MB)
```

- WebP and HEIC are refused with `file_type`.
- The routine must not define a second `CHAT_FILE_MIMES` or `baseMime`. `packages/shared/src/index.ts` does `export *` from both `schemas` and `messaging`, so a duplicate name fails with TS2308.

### 1.3 `packages/shared/src/messaging/schemas.ts`

- `threadFileUploadSchema` = `{ clientRequestId: uuid, mime: enum(CHAT_SEND_MIMES), size: int ≥ 1 }`.
- `threadFileSendSchema` = `{ clientRequestId: uuid, path: string, filename: trimmed 1–200 with no "/" or "\", caption?: trimmed ≤ WA_CAPTION_MAX }`.
- Name the input type `ThreadFileSendInput`. `ThreadFile` is already taken in `thread-media.service.ts`.

### 1.4 `packages/shared/src/messaging/chat/views.ts`: MessageView gets three optional fields only

```ts
/** A sent file's name (D2); null for inbound, text and template rows. */
media_name?: string | null;
/** Staff who sent it: the teacher's display_name_ar, else profiles.full_name; null = automatic, imported history or inbound (D4). */
sender_name?: string | null;
/** Outbound queued by the platform with no staff behind it (created_by null, dedup_key set). NOT send-stale's isAutomatic (the auto-messages switch gate). */
automatic?: boolean;
```

- Mark `sent_by_teacher_name` `@deprecated` in its comment, but keep filling it. Old mobile builds and cached rows read it.

### 1.5 `packages/shared/src/messaging/chat/sender.ts` (new, plus `sender.test.ts`)

- `senderLine(m): { kind: 'name'; name: string } | { kind: 'auto' } | null`:
  - inbound → null;
  - `sender_name || sent_by_teacher_name` → name;
  - else `automatic` → auto;
  - else null.
- Test cases: teacher, admin, sales, auto, imported history, inbound, and an old row that has only `sent_by_teacher_name`.

### 1.6 i18n: all keys in both `ar.json` and `en.json`

| Key | ar (MSA) | en |
|---|---|---|
| `inbox.playMedia` | «تشغيل {kind}» | "Play {kind}" |
| `inbox.automaticMessage` | «رسالة تلقائية» | "Automatic message" |
| `inbox.composer.attach` | «أرفق صورة أو ملف PDF» | "Attach an image or PDF" |
| `inbox.composer.removeFile` | «إزالة الملف» | "Remove file" |
| `inbox.composer.captionPlaceholder` | «أضف تعليقًا (اختياري)» | "Add a caption (optional)" |
| `inbox.composer.sendFile` | «أرسل» | "Send" |
| `inbox.error.file_type` | «يمكن إرسال صور JPG أو PNG أو ملفات PDF فقط» | "Only JPG or PNG images and PDF files can be sent" |
| `inbox.error.file_too_large` | «الملف أكبر من الحد المسموح» | "The file is larger than allowed" |
| `inbox.error.file_path` / `file_upload` | «تعذّر رفع الملف. حاول مرة أخرى» | "The file could not be uploaded. Try again" |
| `inbox.error.files_forbidden` | «إرسال الملفات غير متاح لك» | "You cannot send files" |
| `inbox.error.media_handoff` | «لا يمكن إرسال الملفات عبر واتساب يدويًا. أعد المحاولة من هنا» | "Files cannot be handed off to WhatsApp; retry here" |

Reuse the existing keys `inbox.media.{image,audio,video,document}`, `inbox.sentBy`, `openMedia`, `viewMedia`, `mediaExpired` and `mediaNotAllowed`. Update `settings.hints.uploadMaxMb` so it also mentions chat files.

## 2. Migrations and types

There is nothing on any remote branch above `20261019000490`.

### 2.1 `packages/db/supabase/migrations/20261019000500_wa_media_audio_video.sql` (D1)

```sql
-- Owner 2026-10-19 #1: voice notes and videos families send play in the chat. wa-media takes WhatsApp's
-- audio/video types up to 16 MiB; images/PDFs keep their 10 MB cap in the API (chatFileMaxBytes).
update storage.buckets
   set file_size_limit = 16777216,
       allowed_mime_types = array[
         'image/jpeg','image/png','image/webp','image/heic','application/pdf',
         'audio/ogg','audio/mpeg','audio/mp4','audio/aac','audio/amr','video/mp4','video/3gpp']
 where id = 'wa-media';
-- The daily WaMediaRetentionJob: cached INBOUND files older than 30 days.
create index if not exists messages_media_cached_idx
  on public.messages (created_at) where media_path is not null and direction = 'inbound';
-- No policy change: storage_invoices_admin (170:56-58) stays admin-only; the API uses the service role and hands out signed URLs.
```

### 2.2 `20261019000505_chat_send_files.sql` (D2)

```sql
-- Owner 2026-10-19 #2: staff send images/PDFs inside the 24 h window. File in wa-media at
-- out/{actor}/{client_request_id}/{uuid}.{ext} (messages.media_path); the name the family sees in media_name.
alter table public.messages
  add column media_name text
    check (media_name is null or char_length(btrim(media_name)) between 1 and 200);
```

No bucket change and no RLS change are needed here:

- wa-media already takes jpeg, png and pdf.
- A signed upload needs no insert policy (migration 133).
- `messages_content_check` (migration 142) already accepts an outbound row that has only `media_path`.

### 2.3 `20261019000510_message_sender_profile.sql` (D4)

`created_by` currently points at `auth.users`, which PostgREST cannot embed. This migration points it at `profiles`.

```sql
alter table public.messages drop constraint if exists messages_created_by_fkey;
alter table public.messages add constraint messages_created_by_fkey
  foreign key (created_by) references public.profiles (id) not valid;
do $$ begin
  alter table public.messages validate constraint messages_created_by_fkey;
exception when foreign_key_violation then
  raise warning 'messages_created_by_fkey left NOT VALID: some created_by have no profiles row';
end $$;
```

- The default constraint name comes from migration 072:30, so `drop … if exists` matches it.
- `user_references()` still lists `messages.created_by` once.
- Before the staging deploy, run the **mandatory** pre-check, which must return 0:
  `select count(*) from public.messages m left join public.profiles p on p.id = m.created_by where m.created_by is not null and p.id is null;`
  If it is not 0, report the number in the PR. The migration still applies, as NOT VALID.

### 2.4 `packages/db/src/types.ts`: one edit for D2 and D4

- `messages` Row, Insert and Update gain `media_name: string | null` (optional in Insert and Update).
- `messages.Relationships` gains:
  `{ foreignKeyName: 'messages_created_by_fkey', columns: ['created_by'], isOneToOne: false, referencedRelation: 'profiles', referencedColumns: ['id'] }`
- Regenerate the types if the sandbox has a DB. Otherwise add them by hand.

### 2.5 Migration tests

- `apps/api/src/modules/messaging/whatsapp/wa-media-bucket.migration.test.ts`: a SQL-text test in the style of `restricted-templates.migration.test.ts`. It asserts that every entry of `PLAYABLE_MIMES` and `INVOICE_MIMES` appears in migration 500, and that `16777216` and `messages_media_cached_idx` are present. This keeps the bucket and the shared list in sync.
- `e2e/tests/messaging/chat-files.sql.spec.ts`, in the style of `student-recordings-rls.sql.spec.ts` and `apply-lesson-changes-v3.sql.spec.ts`:
  - wa-media has `file_size_limit = 16777216` and its `allowed_mime_types` include `audio/ogg` and `video/mp4`;
  - an insert with `media_name = '   '` violates the check;
  - the FK of `messages_created_by_fkey` targets `public.profiles`;
  - the orphan `created_by` count is 0.

## 3. Decision 4: sender name on every outgoing bubble

This change reads data only. `created_by` writes stay as they are, because `isAutomatic` and `sender.queries.ts:70 .is('created_by', null)` depend on jobs leaving it null.

**API: `apps/api/src/modules/messaging/whatsapp/messages/message.mapper.ts`** (84 lines, about 95 after)

- `MESSAGE_SELECT` becomes `'*, sent_by_teacher:teachers!messages_sent_by_teacher_id_fkey(display_name_ar), sender:profiles!messages_created_by_fkey(full_name)'`.
- `ThreadMessageRow` gains `sender?: { full_name: string } | null`.
- `toMessageView` adds:
  - `sender_name`: when outbound, `row.sent_by_teacher?.display_name_ar ?? row.sender?.full_name ?? null`; otherwise null. The teacher's name wins, so «أرسلها: أبرار» in `e2e/tests/teacher-mode.spec.ts:104` still passes.
  - `automatic`: `row.direction === 'outbound' && row.created_by === null && row.dedup_key !== null`.
- `sent_by_teacher_name` stays as it is.
- Every caller inherits this with no service change: admin `threads.service.ts:51`, `sales-threads.service.ts:47`, `teacher-threads.service.ts:53`, Outbox and messages.service.
- The sales redaction (`sales-threads.ts`) is unchanged.

**Web: `apps/web/src/features/messaging/inbox/messages/components/MessageBubble.tsx:85-87`** (106 lines)

- Replace the teacher-only line with `senderLine(m)`. It renders `t.inbox.sentBy` with the name, or `t.inbox.automaticMessage`, in the same `text-2xs` style.

**Mobile**

- `apps/mobile/src/inbox/thread/hooks/thread-mode.tsx:42`: `sentByName` becomes `senderText(m)`, built on `senderLine`.
- `MessageMeta.tsx:32-36` renders it.
- The optimistic row (`thread-cache.ts`) has neither field, so the line appears when the API row arrives.

**Tests**

- `apps/api/src/modules/messaging/whatsapp/messages/message.mapper.sender.test.ts` (new): the teacher's name wins; `full_name` is used for admin and sales; `automatic` is true only for outbound with created_by null and dedup_key set; imported history (dedup_key null) gives false and no name; inbound gives null and false; one assertion that `MESSAGE_SELECT` contains `sender:profiles!messages_created_by_fkey`.
- `apps/web/src/features/messaging/inbox/messages/components/MessageBubble.sender.test.tsx` (new): an assistant's row shows «أرسلها: سارة», a job row shows «رسالة تلقائية», and an imported or inbound row shows neither.
- Extend `apps/mobile/src/inbox/thread/hooks/thread-mode.test.ts` with the same cases.
- Grep `e2e/tests` for assertions on the whole text of outbound bubbles. Every outbound bubble now has a sender line, so those may need updating.

**Known behaviour (in the PR body):** a staff-triggered template shows the staff member's name, not «رسالة تلقائية». This covers booking confirmations, lesson-change notices, the join link, meeting invites, and the admin's rating or feedback sends. `report_ready`, reminders, follow-ups, renewal alerts and changes a guardian triggered show «رسالة تلقائية».

## 4. Decision 1: voice notes and videos play in the chat (16 MB, kept 30 days)

Teachers still get labels only. Docs/20 :231 stays open with today's default.

### API

1. **`InboundMedia`** (`inbound-media.service.ts`, 86 lines)
   - Split the gate out as an exported function `servable(msg, allow = isInvoiceMime)`. It throws `invoice_message` unless the row is inbound, has a `media_id`, and `allow(media_mime)` is true.
   - `load(messageId, allow = isInvoiceMime)` uses it.
   - The default keeps `booking.invoice.ts` fromChat and `apps/api/src/modules/sales/sales-money/chat/sales-chat-files.ts` `copy()` limited to images and PDFs.
   - `cache()` caps the size with `chatFileMaxBytes(mime)` instead of `INVOICE_MAX_BYTES`. It still answers 413 `invoice_too_large`.
2. **`ThreadMediaService`** (`apps/api/src/modules/messaging/inbox/files/thread-media.service.ts`, 55 lines)
   - `file()` and `list()` stay **unchanged**. The admin `/media/:id` route and `SalesChatFiles.sign` keep images and PDFs only.
   - Add `bubbleFile({ phone, messageId })`, used only by W6:
     1. `queries.message(id)`. 404 `message_not_found` when it is missing or belongs to another phone. The ownership check now runs first.
     2. Outbound: no `media_path` gives 410 `media_expired` (imported history). Otherwise sign `wa-media/media_path` directly with mime `baseMime(media_mime)`. This branch is for D2.
     3. Inbound: `servable(msg, isChatViewMime)`, then `media.cache(msg)`, then a 1 h `signedDownload`.
3. **`ThreadFileController.file`** (`thread-file.controller.ts`): calls `media.bubbleFile`. Update the doc comment: audio and video are served now, outbound sent files too, and the teacher still gets 403 `media_forbidden`.
4. **`apps/api/src/common/storage/storage.paths.ts` EXT**: add `'video/mp4':'mp4'`, `'video/3gpp':'3gp'` and `'audio/amr':'amr'`. Add cases to `storage.paths.test.ts`.
5. **Download timeout** (`graph.ts` and `kapso.ts`)
   - `GraphRequest` gains `timeoutMs?: number`. `graphFetch` uses `AbortSignal.timeout(req.timeoutMs ?? conn.timeoutMs)`.
   - `fetchMedia` passes `timeoutMs: 60_000` to the **byte** fetch on both drivers (`kapso.ts:47` and `:51`). The same signal covers `res.arrayBuffer()`.
   - A timeout is still a DOMException that `InboundMedia.download` rethrows as a 500. That is accepted and noted with a `ponytail:` comment.
6. **Retention**
   - `StorageService` gains `removeMany({ bucket, paths })`: one Supabase `remove(paths)` call. Removing a path that does not exist is a no-op.
   - `InboundMediaQueries` gains `cachedBefore({ before, limit })`: id and media_path of inbound rows with `media_path` set and `created_at < before`, oldest first.
   - It also gains `clearPaths(ids)`: `update media_path = null where id in ids and direction = 'inbound'`.
   - New `apps/api/src/modules/messaging/whatsapp/messages/wa-media.retention.job.ts`, an in-process timer modelled on `apps/api/src/common/activity/activity.retention.job.ts`:
     - first run 15 min after boot, then every 24 h;
     - `runOnce()` loops batches of 100 until a batch is empty, with a cap of 50 batches per run (the staging backlog);
     - each batch calls `removeMany`, then `clearPaths`;
     - any error is logged and stops this run. It never throws and returns the number purged.
   - It is idempotent: a second run, or a second API instance, removes nothing new.
   - The rule is 30 days from `created_at`, for every **inbound** kind. Photos and PDFs follow the owner's «like photos».
   - A purged row then matches `mediaExpired` (media_path null and older than 29 days), so it gets 410 «انتهت صلاحية الملف» with no extra code.
   - Register the job in `whatsapp.module.ts`.
   - **The job stays inbound only.** Sent files (`out/…`) are kept. Clearing `media_path` on a sent row with no caption would break `messages_content_check`.

### Web

7. **`MessageMedia.tsx`** (87 lines)
   - `viewable` becomes `isChatViewMime` from `@ab/shared`.
   - The gate at :85 changes to `!teacher && isChatViewMime(m.media_mime)`, with the `direction === 'inbound'` check removed. This covers D2 too.
   - The button reads `playMedia` for playable types and `viewMedia` otherwise. It still fetches only after the click.
   - `Loaded` renders `<MediaPlayer>` when `isPlayableMime(file.mime)`.
   - A PDF link shows `m.media_name` when it is set (D2).
8. **`MediaPlayer.tsx`** (new)
   - `<audio controls autoPlay preload="metadata" className="w-64 max-w-full">` or `<video controls playsInline autoPlay preload="metadata" className="max-h-72 max-w-full rounded-md">`, with `aria-label` set to the kind.
   - `src` is pinned with `useState(file.url)`, so a refetch of the signed URL never restarts playback.
   - `onError` falls back to the «افتح {kind}» link (`target="_blank"`). This covers amr, 3gpp and ogg on Safari.

### Mobile (JS-only, OTA)

9. **Opening files**
   - New `apps/mobile/src/inbox/messages/hooks/thread-file.ts`: a query hook for `GET /threads/:phone/messages/:id/file` with `meta: { noPersist: true }`, following the `booking/invoice-queries.ts` pattern.
   - New `apps/mobile/src/inbox/messages/components/MessageFile.tsx`, for rows where `isChatViewMime(media_mime)` holds, in both directions, outside teacher mode:
     - a Pressable «تشغيل {kind}» or «عرض {kind}»;
     - on tap: `queryClient.fetchQuery`, then `Linking.openURL(url)`;
     - 410 shows `mediaExpired`; 403 or teacher mode shows `mediaNotAllowed`.
   - `MessageBubble.tsx` (91 lines) renders `MessageFile` for those rows and keeps `MediaLine` for the rest.
   - This also gives mobile sales the photo and PDF access it lacks today.

### Tests

- `chat-media.test.ts`: the MIME sets and the size caps.
- `inbound-media.service.test.ts`:
  - `audio/ogg; codecs=opus` with `isChatViewMime` is cached as `.ogg` with contentType `audio/ogg`;
  - audio over 16 MB, or an image over 10 MB, gives 413;
  - the default `load()` still refuses `audio/ogg` with `invoice_message`;
  - `fetchMedia` is called with `timeoutMs` 60 000. Pin it in `kapso.test`/`graph` for both drivers.
- `thread-file.http.test.ts`:
  - sales gets 200 for audio, for video, and for an outbound row with `media_path`;
  - an outbound row with no `media_path` gives 410;
  - another phone's row gives 404;
  - the teacher still gets 403;
  - admin `/media/:id` still answers 400 for audio (pins the side-effect fence).
- `wa-media.retention.job.test.ts`:
  - an old cached row is removed and then cleared;
  - a `removeMany` failure leaves `media_path` in place for the next day;
  - an empty run makes no update;
  - batches loop until empty and stop at the cap;
  - `runOnce` never throws.
- Web:
  - `MessageMedia.test.tsx`: rewrite :63 so an audio row shows «تشغيل رسالة صوتية», makes no fetch on render, and after the click renders `<audio src=signed>`. Also cover an outbound PDF row with `media_name`.
  - `MediaPlayer.test.tsx`: video gives `<video>`; a fired `error` event gives the link; the src is unchanged after a rerender with a new url.
- Mobile `MessageFile.test.tsx`: a tap requests the W6 path and calls `Linking.openURL(signed)`; 410 shows expired; teacher mode shows the label with no request.
- e2e `e2e/tests/messaging/inbox-media.spec.ts`: add `stubInboundMedia({ media: { kind: 'audio', mime: 'audio/ogg; codecs=opus', base64: <tiny> } })` (the `e2e/support/messaging/inbox.ts` helper already accepts audio). Click «تشغيل رسالة صوتية» and check that the bubble's `audio` element has a `src`.

## 5. Decision 2: the assistant sends images and PDFs from the chat

Only inside the 24 h window, stored and logged under her name. Sending is by link, and the body is the same on both drivers.

### API

1. **`apps/api/src/modules/messaging/inbox/send/thread-send.service.ts`**: export `dedupKey`, `outboundBase` and `sendLine` as module functions. Behaviour does not change and the file does not grow.
2. **`storage.paths.ts`**
   - `chatOutPath({ actorId, requestId, mime })` returns `out/${actorId}/${requestId}/${uuid}.${ext}`.
   - `isChatOutPathOf(path, { actorId, requestId })` requires exactly 4 segments, with the first three matching.
   - Add tests.
3. **`apps/api/src/modules/messaging/inbox/files/thread-file-send.service.ts`** (new, class `ThreadFileSender`)
   - Constructor: `(queries: ThreadsQueries, outbox: Outbox, storage: StorageService)`.
   - Settings are property-injected, following the `thread-reads.ts:19-21` precedent: `@Inject(SettingsService) private readonly settings?: SettingsService`. `maxBytes = uploadMaxBytes(this.settings ? await this.settings.all() : {})`.
   - `uploadUrl(s)`: `chatFileProblem` gives 400 `file_type` or 413 `file_too_large`; then `storage.signedUpload({ bucket: BUCKETS.waMedia, path: chatOutPath(…) })`.
   - `send(s)`, strictly in this order:
     1. `key = dedupKey(s)`. A missing `clientRequestId` gives 400.
     2. `thread = queries.thread(phone)`, then `sendLine(thread, now)`. This is the server-side 24 h check: 409 `session_closed` or 503 `line_not_configured`.
     3. `isChatOutPathOf`, else 400 `file_path`.
     4. `storage.info`, where null gives 400 `file_path`. Take `mime = baseMime(info.contentType)` and run `chatFileProblem` on Storage's own mime and size.
     5. `storage.head(SNIFF_BYTES)` plus `sniffMime` (`booking/invoice-sniff.ts`) must equal that mime, else 400 `file_type`.
     6. `outbox.send({ ...outboundBase(s, thread), dedup_key: key, body: caption ?? null, media_path, media_mime: mime, media_name: filename, ...line })`.
   - `outboundBase` sets `created_by = actorId`, which drives the D4 name and the audit.
   - A replayed `clientRequestId` returns the first row. Each attachment needs a fresh UUID, because the dedup namespace is shared with text sends.
4. **`apps/api/src/modules/messaging/inbox/files/thread-file-send.controller.ts`** (new, `ThreadFileSendController`)
   - Constructor: `(reads: ThreadReads, files: ThreadFileSender, audit: AuditService)`.
   - Class: `@Permissions('inbox.read')` and `@Controller('threads')`.
   - `POST :phone/file-upload-url` is handler `uploadUrl` (201). `POST :phone/file` is handler `send` (201). Both carry method-level `@Permissions('inbox.send')`.
   - A teacher gets 403 `files_forbidden`: `!sales && (await reads.scope(user))`, the same check as `thread-file.controller.ts:38`.
   - `send` is audited with action `thread_file` and `after = { phone, media_mime, media_name, status, sales_id }`, skipped on a replay.
   - Register it in `inbox.module.ts`.
5. **`apps/api/src/modules/messaging/inbox/send/send-audit.ts`** (new)
   - `export async function recordSend(audit, input)` holds the body moved out of `ThreadsController.audited()` (`threads.controller.ts:78-93`). That method becomes a one-line call.
   - The `after` payload accepts the extra media fields.
6. **`apps/api/src/common/auth/parity/access-before.json`**: add `"ThreadFileSendController.uploadUrl": ["admin","sales","teacher"]` and `"ThreadFileSendController.send": ["admin","sales","teacher"]`. The file records who passes the guard; the teacher's 403 happens in code.
7. **Sender**
   - `sender.due.ts`: add `media_path`, `media_mime` and `media_name` to `DUE_COLUMNS`, and as **optional** fields of `DueMessage`, so existing fixtures still compile.
   - `message.dispatch.ts` (70 lines): add a media branch **before** the `!row.template_key && row.body` branch (:64). Otherwise a captioned file goes out as plain text.

     ```ts
     if (!row.template_key && row.media_path) {
       return this.lines[line].sendDocument({ to: row.phone_e164, kind: waMediaKind(row.media_mime ?? null),
         url: await mediaLink(this.storage, row.media_path), filename: row.media_name ?? undefined, caption: row.body });
     }
     ```

   - `mediaLink` is a sibling of `documentLink`. It signs **only** `BUCKETS.waMedia`, only for paths that start with `out/`, for `SIGNED_URL_SECONDS.whatsapp`. Each retry signs again.
   - Delete the `ponytail:` comment at :67.
   - `send-plan.ts` `messageLabel`: a media row with no caption uses `inbox.media.image` or `inbox.media.document`, so the failure push is not empty.
8. **Client contract: `sendDocument` keeps its name** (no rename churn, and `whatsapp.client.ts` stays at 145 lines)
   - Its input gains `kind?: 'image' | 'document'` (default document), and `filename` becomes optional.
   - Touch only the inline type in `whatsapp.types.ts:62`, `whatsapp.client.ts:63-65` and `live-client.ts:28-29`.
   - In `wa-components.ts`, `documentMessage` becomes `mediaMessage({ to, kind, url, filename?, caption? })`, which builds `{ type: kind, [kind]: { link, caption?, filename? (document only) } }`.
   - Kapso needs no code change: same path, same body, `X-API-Key`.
9. **Views and fallback**
   - `message.mapper.ts`: add `media_name`, and set `click_to_chat = null` for an outbound row with `media_path`. A file cannot ride along in wa.me.
   - `apps/api/src/modules/messaging/whatsapp/messages/messages.service.ts` `handOff`: a media row gives 409 `media_handoff`. Retry stays allowed.
10. **wa-stub** (`tools/wa-stub/src/send.ts` `refusal()`): an `image` or `document` body without `link` or `id` gets 400 with Meta code 100. Add `tools/wa-stub/src/stub.media.test.ts`.

### Web

11. **`apps/web/src/features/messaging/inbox/api/api.files.ts`** (new; `api.ts` is at 133 lines)
    - `fileUploadUrl`;
    - `uploadChatFile({ phone, requestId, file })`, a signed PUT via `supabase.storage.uploadToSignedUrl`, copied from `booking/api.invoice.ts:18-27`;
    - `sendFile`.
12. **`AttachButton.tsx`** (new)
    - A paperclip IconButton labelled `composer.attach`, with a hidden `<input type="file" accept="image/jpeg,image/png,application/pdf">`.
    - A client-side `chatFileProblem` check uses the public config's `uploadMaxBytes`.
    - It is shown only when `thread.session_open && access.files`.
    - `use-chat-access.ts` gains `files: send && mode !== 'teacher'`.
13. **`FileComposer.tsx`** (new) replaces TextComposer while a file is picked:
    - a chip: an object-URL thumbnail for an image, or name and size for a PDF, plus «إزالة الملف»;
    - a caption box (≤ 1024 characters) and «أرسل»;
    - `mutationKey ['inbox-send', phone]`, so the existing in-flight lock is shared;
    - `onMutate: sendStart()` and `onSuccess: settleOwnSend(phone, view.id, start)`, then invalidate `['threads']`;
    - errors go through `send-error.ts`;
    - the `clientRequestId` is kept in a ref across a failed resend of the same file.
14. **`ComposerPhone.tsx`** (100 lines): add `file` state and `leading={<>{toggle}{attach}</>}`.
    - TextComposer gets **no** new lines.
    - A picked file is dropped on a chat switch. File objects never go into the draft store.

### Mobile (JS-only, OTA): images only

15. **`apps/mobile/src/inbox/composer/send-file.ts`** (new)
    - It reuses `pickReceipt` from `apps/mobile/src/payments/receipt.ts` (JPEG, quality 0.6, no EXIF; `expo-image-picker` is already in the APK).
    - Then `POST file-upload-url` and `uploadToSignedUrl`, following the `apps/mobile/src/assistants/statements/hooks/upload-receipt.ts` pattern.
    - Then `POST /file` with no caption. The `clientRequestId` comes from the same helper the mobile text send uses.
16. **`apps/mobile/src/inbox/AttachImage.tsx`** (new): an IconButton in the open-window row of `Composer.tsx` (106 lines; the button lives in its own file). It is hidden in teacher mode and when the window is closed.
    - PDFs from mobile need `expo-document-picker`, which means a new APK, so they are not in this routine.

### Tests

- `chat-files.test.ts`: `waMediaKind`; `chatFileProblem` gives a PNG over 5 MB `file_too_large`, accepts a PDF ≤ maxBytes, refuses WebP and HEIC.
- `thread-file-send.service.test.ts`:
  - a path for the wrong actor or request id gives 400 `file_path`;
  - a sniff mismatch gives `file_type`;
  - over the size limit gives `file_too_large`;
  - a closed window gives 409 **before** any storage call;
  - a replay returns the first row;
  - the row has `created_by` set to the actor and `line` stamped.
- `thread-file-send.http.test.ts`:
  - sales gets 201 plus an audit row with action `thread_file` under her actor id;
  - a teacher gets 403 `files_forbidden`;
  - a missing `clientRequestId` gives 400.
- `message.dispatch.media.test.ts`:
  - a captioned JPEG becomes `type:image` with a caption, **not** a text;
  - a PDF becomes `type:document` with its filename;
  - only wa-media and `out/` paths are signed.
- `wa-components.test.ts`: `mediaMessage` for both kinds.
- `whatsapp.client.kapso.test.ts`: `sendDocument({kind:'image'})` sends `X-API-Key`, no bearer, and the same body. This is the Kapso pin.
- `messages.service` handOff test: a media row gives 409.
- Web: `AttachButton.test.tsx`, `FileComposer.test.tsx` (the send lock is shared, a sign-out mid-send leaves nothing in the next tab), and the outbound case in `MessageMedia.test.tsx`.
- Mobile: `send-file.test.ts` and `AttachImage.test.tsx` (hidden for teacher mode and for a closed window).
- e2e:
  - New `e2e/tests/messaging/inbox-send-file.spec.ts`: a sales user; a stub inbound opens the window; attach a tiny PNG fixture; send. `stubSent()` has `type: 'image'` with `image.link`. The bubble's «عرض صورة» opens. A closed window hides the paperclip.
  - Extend `e2e/tests/messaging/kapso-driver.spec.ts`: on the line it switches to Kapso, after the inbound, send a file. `stubRequests()` then shows `via: 'kapso'` with `body.type === 'image'`.

## 6. Decision 3: bell and browser push go to the owning assistant

"Assistant" means `profiles.role = 'sales'`. Admins are unchanged: `notifyAdmins` stays as it is. This decision has no migration, no i18n change, and no web or mobile change; the receiving side already exists.

### Recipient rule (one rule, built in `PushService.notifySales`)

```ts
async notifySales(kind: PushKind, event: PushEvent, owners: readonly string[]): Promise<void> {
  try {
    const owned = owners.length ? await this.audience.recipients(kind, owners) : [];
    const ids = owned.length ? owned.map((p) => p.id) : await this.audience.salesIds();
    await this.notifyProfiles({ ...event, kind, profileIds: ids });
  } catch (e) { this.warn(`${kind}:${event.subject}`, e); }
}
```

- `new_lead`: owners `[]`, so every enabled salesperson gets it (the owner's wording, even when auto-assign already picked someone).
- `new_message`: the owners, intersected with whoever may receive this kind.
  - If an owner is an admin, the admin's row deduplicates against `notifyAdmins` (same `dedup_key`), so the push does not spread to assistants.
  - If no owner is eligible (disabled, or lacking `inbox.read` or `notifications.push`), or there are no owners, it goes to all enabled sales.
- A teacher's phone: admins only.
- A job applicant: unowned, so all sales.
- Rate limit: the existing 10-minute subject bucket plus the per-profile dedup key. Nothing new is built.

### Build

1. **`apps/api/src/common/push/dispatch/push.audience.ts`** (69 lines): `private roleIds(role: 'admin' | 'sales')`, with `adminIds()` and `salesIds()` as one-liners.
2. **`push.service.ts`** (105 lines, about 115 after): add `notifySales` as above.
3. **`apps/api/src/modules/sales/sales/sales-ownership.ts`** (44 lines): add `guardianOwnerIds(db, guardianId)`. It runs two parallel queries and returns the union with nulls dropped:
   - students' `brought_by` where `guardian_id = guardianId`;
   - leads' `assigned_to` where `converted_guardian_id = guardianId`.
4. **`apps/api/src/modules/messaging/webhook/inbound/webhook.inbound.store.ts`**
   - `LeadLink` gains `owner: string | null`. In `sender()` it is `row.assigned_to` from the `upsertByPhone` row. That row comes back from the `assigned()` / `touch()` path with `select('*')` (`leads.queries.ts:59` and `:69`) and already reflects auto-assign. This costs no query, and `identify()` and `Contact` are unchanged.
   - It is null for the guardian, teacher and applicant paths.
   - Add `owners(who: Contact, lead: LeadLink): Promise<string[]>`: `lead.owner`, plus `guardianOwnerIds(guardian.id)` when a guardian wrote, de-duplicated. `webhook.queries.ts` (130 lines) is not touched; the store calls `guardianOwnerIds` with its db through a 3-line `WebhookQueries.guardianOwners`, or directly if the store already holds a Db.
5. **`webhook.inbound.service.ts`** (77 lines): after `notifyAdmins`, call `this.notifySalesFor(kind, event, { who, lead })`:
   - return if `who.teacher`;
   - `owners = kind === 'new_lead' ? [] : await store.owners(who, lead)`, inside a try/catch that warns and returns on failure;
   - then `push.notifySales(kind, event, owners)`.
   - The constructor stays at 3 parameters. A replayed wamid still returns before either push.
6. **`webhook.fakes.ts`**: add `notifySales: vi.fn().mockResolvedValue(undefined)` and an `owners`/`guardianOwners` stub returning `[]`. The existing `notifyAdmins` assertions keep passing.

### Tests

- `push.audience.sales.test.ts`: `salesIds` returns enabled sales only.
- `push.service.sales.test.ts`:
  - the owner only;
  - an admin owner gives no sales rows;
  - a disabled owner gives all sales;
  - an owner without `inbox.read` gives all sales;
  - no owners gives all sales;
  - the dedup key is `new_message:{subject}:{id}`, and a second identical call writes no row;
  - a throw from `salesIds` is swallowed.
- `apps/api/src/modules/messaging/webhook/inbound/webhook.inbound.owners.test.ts`:
  - lead owner A gives owners `['A']`;
  - a guardian whose children were brought by A and B, plus converted-lead owner C, gives A, B, C;
  - unowned gives `[]`;
  - `new_lead` gives `[]` with no lookup;
  - a teacher means `notifySales` is not called;
  - a lookup that throws means `handle` resolves, `notifyAdmins` was called and `notifySales` was not;
  - a replay means neither is called.
- `sales-ownership.test.ts`: a case for `guardianOwnerIds`.
- e2e `e2e/tests/messaging/inbox-push-owner.spec.ts`, API-level against wa-stub with push delivery off in CI (only bell rows are checked):
  - Use `makeAssistant` ×2 (A, B), `freshPhone()` and `leadOf(A, phone)` from `e2e/support/sales/assistant-api.ts`.
  - Add `pushesForProfile({ profileId, kind, phone })` next to `pushesForPhone` in `e2e/support/messaging/inbox.ts`.
  - Inbound from that phone: A has a `new_message` row, B has none, the admin has one.
  - SQL sets `assigned_to = null`, then a second inbound: B gains a row (a new dedup key), and A's is deduplicated.
  - A fresh phone: A and B both get `new_lead`.
  - Assert only on A and B, because parallel specs create other assistants.

## 7. Security and RLS

- **No new table and no policy change.**
  - The wa-media storage policy stays admin-only (migration 170:56-58).
  - The API uses the service role. Sales and the browser only ever hold signed URLs: a 1 h download, a signed PUT (no insert policy needed, migration 133), and a 7-day link that only Meta uses.
  - `push_notifications` RLS is unchanged.
- **Scope:** sales sees and answers every chat by owner decision (`sales-scope.ts:4-9`). The checks that matter are:
  - W6 and the file POSTs answer 404 for another phone's message;
  - the teacher gets 403 (`media_forbidden` / `files_forbidden`);
  - other base roles get 403 from the guard or `TeacherScopes.of`;
  - `isChatOutPathOf` ties an upload to actor and request id;
  - the sniffed bytes must match the mime Storage reports;
  - `mediaLink` signs only `wa-media/out/…`;
  - sent files are never `LINK_TEMPLATES` rows (`report_ready` keeps using the reports bucket).
- **24 h window:** checked server-side before enqueue (`sendLine`), and the same line is stamped on the row. If the window closes after queuing, Meta's 131047 fails the row, as for a text. wa-stub enforces the window per recipient.
- **Invoice and receipt paths stay narrow:** `load()` defaults to `isInvoiceMime`, `SalesChatFiles.copy` still checks `isReceiptMime`, and `ThreadMediaService.file` and `list` are unchanged. A test pins this.

## 8. Drivers and wa-stub

- **Inbound audio and video:** the shared `fetchMedia` already handles both drivers. Meta uses the bearer token; Kapso uses `download_url` with no credential. The only change is the 60 s byte timeout.
- **Outbound image and document:** the same `POST /{phone_number_id}/messages` body on both drivers, with a bearer token for Meta and `X-API-Key` for Kapso. This has never been sent through Kapso before, so it is pinned twice: the `whatsapp.client.kapso.test.ts` case and the `kapso-driver.spec.ts` e2e step.
- **wa-stub:**
  - It already serves any inbound mime (`webhook.ts:56-75`).
  - It records `via` for each send.
  - The new `refusal()` rule (an image or document must carry `link` or `id`) catches dispatch bugs.
  - The stub never fetches links, so the link itself is covered only by unit tests.

## 9. Docs

- `docs/20-web-assistant-chat.md`:
  - :103 MIME note: audio and video are served, sent files are served, 16 MB, 30-day purge of inbound files.
  - :230, :232 and :233: mark as decided (2026-10-19) and say what was built.
  - :231 stays open (teachers keep labels).
  - Add a short «Decisions 1–4 as built» section.
- `docs/03-requirements.md` R-MSG-06: audio and video, 16 MB, 30-day purge of inbound chat files. Invoice and receipt copies are not affected.
- `docs/12-phase4-contracts.md`:
  - §3 :62: the `sendDocument` input gains `kind?` and an optional `filename`.
  - §6: the Owner column of the `new_lead` and `new_message` rows, plus a §6.1 bullet «Inbox pushes to assistants (owner 2026-10-19)» with the rule from §6 of this spec.
- `docs/19-messaging-drivers.md`: a row «Outbound media: by link, same body on both drivers».

## 10. Out of scope (follow-ups)

- **Inline playback on mobile:** needs `expo-audio` and `expo-video`. **PDFs from mobile:** needs `expo-document-picker`. Both need a new EAS APK: bump `version` (runtimeVersion policy `appVersion`), never re-add `forcesRTL`, and iOS needs the Apple account.
- **Teachers opening or sending files:** stays as today (docs/20 :231 is still open).
- **A 30-day purge of sent files:** needs `messages_content_check` extended with `OR media_name IS NOT NULL` first.
- **Sweeping orphan uploads** under `wa-media/out/` (picked but never sent).
- **Voice notes sent by staff.**
- **A per-kind notification mute.**
- **Streaming downloads** instead of buffering up to 16 MB in RAM.
- **Mapping a media download timeout to 502/504** instead of a 500.
- **Any production migration or deploy.**

## 11. Owner questions

None blocks the build. The routine builds these defaults and lists them in the PR body:

| Decision | Default built |
|---|---|
| 1 | Phone app: tapping opens the file in the phone's own player or browser (OTA today); inline playback comes with the next APK. The 30-day purge covers **all** inbound chat files («like photos»). |
| 2 | Only the assistant and the admin send files. A teacher gets 403 `files_forbidden`. |
| 3 | A new lead alerts **every** assistant, even when auto-assign already picked one. |
| 4 | Teachers see the same staff names as everyone else. Staff-triggered templates show the staff member's name. |

## 12. Deploy gates (separate from tests)

- **Staging migrations (500, 505, 510):** run the §2.3 orphan pre-check first, then the usual self-approved staging-db deploy. No production.
- **Decision 3 on staging:** CI has push delivery off, but staging has Expo and VAPID configured. Once deployed, every real inbound message rings real assistants' phones and browsers. The orchestrator tells the owner this in the conversation before the staging deploy. The routine sends **no** test inbound to staging.
- **Staging smoke tests of a file send:** only with the Meta test credentials and allow-listed numbers. Check `WA_ALLOWED_RECIPIENTS` before the deploy. Never use the Kapso real number.
- **Mobile:** an OTA after merge (JS-only). **No new APK for this routine.**

## 13. Mobile needs a new APK?

**No.** Everything in this routine is JS-only and ships by OTA:

- `MessageFile` with `Linking.openURL`;
- sending images through `expo-image-picker`, which is already in the APK;
- the sender line.

The only things that need a new APK are inline audio and video playback (`expo-audio` and `expo-video`) and picking PDFs on mobile (`expo-document-picker`). Both are deferred, as listed in §10.
## 14. Reply «رد» and forward «إعادة توجيه» (owner 2026-10-25, migration 20261025000690)

**Reply.** Any bubble WhatsApp knows (it has a wamid, `MessageView.replyable`) can be quoted. The composer shows one quoted strip; a session text or file sends `replyToMessageId`, which the API resolves to the wamid of a message of the **same chat** (`ThreadQuotes.target`, else 400 `reply_not_in_thread`). Our row keeps `reply_to_message_id` and `reply_to_wa_id`; the sender passes the wamid as Meta's / Kapso's `context.message_id` on texts and files. An inbound reply is linked by the trigger `messages_link_reply` (same phone only). A thread page carries each bubble's quote (`MessageView.reply_to`, one read per page; a template's text is never quoted). Outside the 24 h window the composer is in template mode and reply is off, with the usual hint.

**Forward.** `POST /threads/forward {messageId, targets[1–5], clientRequestId}` copies a text or a file (never a template) to each target through the normal session send path: the actor's scope (a teacher only to their families, never a file), the 24 h window and the line, and then the sender's gates as for any send (messaging switch, `WA_ALLOWED_RECIPIENTS`, the line's driver). A file is copied once per forward to `wa-media/out/{actor}/{request}/fwd-{message}.{ext}` (theirs is fetched into our cache first) and re-sent by signed URL. Per target the answer is «sent» (the new message id) or «skipped» with the send path's reason (`session_closed`, `not_your_thread`, …). The request id is reused per target (the dedup key carries the phone), so a retry returns the same rows. One audit row `thread_forward` per forward, on the source message. The copy stores `forwarded_from_id`; our inbox labels it «مُعاد توجيهها».

**Limits.**
- WhatsApp Cloud API cannot set the «forwarded» flag: the family sees an ordinary message; only our inbox shows the label.
- On a crm line the quote shows in our inbox but WhatsApp gets no context (the CRM wants its own message uuid, docs/19). A forwarded voice note or video goes there as a document (the CRM takes images and documents only).
- A forwarded inbound file must still be fetchable (WhatsApp keeps media ~30 days; after that 410 `media_expired`).
- Mobile: no swipe library in the APK (react-native-gesture-handler is not a dependency); see the mobile notes in the PR for what is used.
