SAFE WEB PLAYBACK OF LESSON RECORDINGS, LESSON FILES AND REPORT ATTACHMENTS: IMPLEMENTATION SPEC (v2, review findings applied)
Follow-up work on feat/lessons-course-recordings (PR #759). It extends lessons-followup.txt A–E and web-deterrents.txt F.
Base: origin/feat/lessons-course-recordings 3b30ea3eb = 4fd5e62b4 + the revert of the TEMP diagnostic 6c9f73f6f + a develop merge that changed only .github/workflows/deploy-staging.yml (+3 lines). Every path:line is on that branch unless marked. «(reviewer)» marks a line a reviewer read that I did not re-read.
Read through git only. Nothing was run.
Copy: C:\Users\NTG\AppData\Local\Temp\claude\23866c66eb0333db\5d942725-537f-4c1e-a5cc-eebe835cd7a2\scratchpad\safe-web-media-spec.md (same text in safe-web-media-spec-final.md; v1 kept as safe-web-media-spec.v1.bak.md)

Rules for every commit:
- CLAUDE.md rules 1–4: ≤ 150 lines per file, ≤ 3 parameters (4 for constructors), strict TS, tests next to the code.
- zod at every boundary.
- Record maps instead of if-chains; no nested ternaries.
- No new *queries.ts.
- Imports through index.ts with @/.
- ≤ 12 code files and ≤ 12 sub-folders per folder (tools/scripts/ci-checks/folder-cap.mjs:10-12; fakes count, tests do not).
- SQL commits load supabase-postgres-best-practices.

Two PRs:
- PR A = C1–C4, C6–C10 (everything that adds the new path; nothing old breaks).
- PR B = C5 + C11 (closes the old storage links), after PR A's production smoke. Old web tabs and old phones keep working through PR A.

0. DECISIONS

| # | Topic | Decision | Why |
|---|---|---|---|
| 1 | Web credential | One HttpOnly cookie `ab_media` on STABLE /media paths. No secret in any web URL. The public report page reuses its existing `ab_report` cookie (report-session.ts:44-45) | One mechanism covers <audio>/<video>, hls.js XHR, <img> pages and download navigations. src is set at render, so iOS keeps the user gesture. A copied URL answers 401 elsewhere |
| 2 | Phones and old builds | Compat: the existing /url routes, R10 (report-files.service.ts:82-88) and the signed-in report page's attachment `url` return `https://api…/media/l/<pair-token>` (1 h, profile-bound, re-checked per request). The cleanup PR deletes them | Installed phones open these URLs in the OS browser or old expo-audio builds, which send no headers. staff-mobile parses the whole report view (use-report-page.ts:25) and `url` is a non-nullable z.url() (packages/shared/src/reports/page.ts:40-45), so the field stays |
| 3 | Signing | signPair/verifyPair (common/http/pair-token.ts:46-87) with secret LOGIN_CODE_PEPPER. The media cookie binds the role through the key context `media-session-v1|<role>` | No new crypto and no copy of report-session.ts:8-41 (jscpd). Prod has the pepper (family sign-in uses it); e2e has it (tools/scripts/env/write-local-env.mjs:30). A context gets its own derived key (pair-token.ts:31-33) |
| 4 | SameSite | Strict. Knob: Lax, only if the iOS device test shows media requests without the cookie | Every legitimate request is same-site (app./api.ayatalbayan.com; CI localhost:5180/3100). The sslip.io web host is cross-site with api.ayatalbayan.com (docs/09-deployment.md:5): ops sends it a 308 to app.ayatalbayan.com before C4 ships |
| 5 | Cookie life | Max-Age 7200, fixed. The web re-mints every 10 min while the tab runs JS (refetchIntervalInBackground). No sliding renewal, no iat | A locked phone or a background tab keeps ≥ 110 min after its last mint, enough for a lesson. A copied cookie lives at most 2 h, which is the bound §7 states. Sign-out in this browser, or any SIGNED_OUT event, clears it. Sign-out elsewhere and a role change apply within ≤ 2 h. Disabled accounts are refused on every request |
| 6 | HLS | IN, behind MEDIA_HLS=false, shipped after the progressive path. Packs only lesson recordings that families can see, whose source sits in the active store, while no lesson is recording. Existing rows start as 'skipped'. Audio re-encoded to AAC (hls_time 30); video copied (hls_time 6) | Owner: «full implementation», «sniffing the video streams». AAC in TS plays on iOS native HLS and in hls.js. Packing while rooms start can make egress refuse a start and lose a lesson (tools/livekit/README.md:46) |
| 7 | CORS | Keep the global enableCors({origin: WEB_ORIGIN list, credentials:true}) (main.ts:30). zod-refine WEB_ORIGIN (env.ts:35) | hls.js XHR and the voice-note blob fallback need credentialed CORS |
| 8 | Range | Recording /file: Range required, ≤ MEDIA_CHUNK_BYTES per 206. Lesson-file and report-file audio and /media/l: Range optional. If-Range is ignored | Plain curl cannot take a recording in one 200, and revocation lands within one chunk. Objects never change, so a range is always valid; honouring a non-matching If-Range would send the full 200 (RFC 9110 §13.1.5) |
| 9 | Per-request gate | Full gate on every media route, segments included. The segment gate is memoised 60 s per API copy | A hide, an unlinked guardian or an expired student stops HLS within 60 s, and a saved key cannot pull segments from another account |
| 10 | Gate cost | Targeted reads (2.3). sentLessons (portal-reports.repo.ts:65-69) is never used on /media | Range and segment requests repeat every few seconds |
| 11 | Audit + caps | One table `media_access`, unique (viewer, asset, purpose, 10-min slot). A start is an HLS key fetch, a first /file chunk, a first page or an original. Playlists and segments are gated and capped, never audited. DB caps via RateLimitRepo; segment and open-stream caps in memory | HlsJsVideo loads the playlist at mount (compat review), so the playlist cannot be the start. The slot key is the dedup (rule 8) |
| 12 | Files to families | Lesson files AND report attachments: families get stamped pages (pdf/image) and the audio stream only. Staff get clean pages + an audited original download | No original PDF/image reaches a family browser from a cookie route (the compat /media/l link still can, until the cleanup PR). The report PDF keeps its signed link: out of scope (lessons-followup.txt:42) |
| 13 | Downloads | GET /media/{recordings,meeting-recordings,lesson-files}/:id/original (cookie, attachment, audited, admin or recordings.manage) | No presigned recording GET is left, so the files host can refuse recording GETs (C11) |
| 14 | Placement | API: modules/teaching/student-recordings/media/. Cookie and link signers in common/http (media-cookie.ts, media-link.ts; the folder has 9 code files). `@MediaAuth()` marker in common/auth/decorators.ts. Web: features/teaching/lesson-files/{player,viewer,protect}/ | modules/teaching and features/teaching already hold 12 sub-folders; common/auth holds 12 code files. reporting and teaching both sign links without importing each other |
| 15 | Auth | AuthGuard accepts ab_media only on @MediaAuth() handlers. No second guard. @Permissions/@SignedIn and the coverage test work as today | Keeps fail-closed permission coverage on /media (auth.guard.ts:27-57; permissions.coverage.test.ts:41-49). TOKEN_VERIFIER needs no export (auth.module.ts:59) |
| 16 | Jobs | @BackgroundJob + Ticker with a CAS claim (ticker.ts:28-79, background-job.ts:43-54, report-pdf.job.ts:94-111) | pg-boss: not found |
| 17 | Dockerfile | No new apt package (ffmpeg, fonts-hosny-amiri, util-linux at Dockerfile:31). Smoke RUN steps after :43. The Amiri path comes from `find`, not fc-match. A path-filtered CI job builds the image | fontconfig is not in the apt line (:31). Today the first image build is roll.sh on the VPS (reviewer) |
| 18 | Devtools guard | IN, last web commit, deterrent only, with an «القيم» off switch | Owner chose «Web deterrents only»; a false positive must be switchable without a deploy |
| 19 | Test-account skips | Not in this work: canSkip exists on no branch (feat/test-accounts) | Wrap the watermark and caps when it lands |
| 20 | Product defaults | HEIC and broken files: «لا يمكن عرض هذا الملف» (pages=0). Teacher reach, group-lesson files and expired students: as today (§7). Stamp label date: the lesson's date | Cheapest; one stamp per (file, student, page) ever |

1. THREAT TABLE

| # | Attack | Today (path:line) | Control | Commit |
|---|---|---|---|---|
| T1 | Link copied and shared (new tab, devtools src, WhatsApp) | 1 h presigned: portal-reports.service.ts:63, portal-assets.service.ts:66, lesson-files.service.ts:76; report attachments report-page.service.ts:60-66 (signed in 1 h, public 30 min), shown as `<a href target=_blank>` ReportPageFiles.tsx:14-20; R10 report-files.service.ts:82-88; `<audio src>` AudioPlayer.tsx:31; new tab FileButtons.tsx:24-27 → open-file.ts:12, PortalFileList.tsx:44-52 | Stable /media URLs need ab_media or ab_report. New-tab paths removed. No storage URL minted | C3, C4, C6, C5 |
| T2 | Staff bulk harvest (≤ 100 signed links per list call) | student-recordings.service.ts:31-37, recording-list.service.ts:33,37-40, lesson-assets.service.ts:34,40-48; `<a download>` students/recordings/RecordingPlayer.tsx:24-34, classroom/recordings/RecordingsPanel.tsx:21-32 | Lists return `url: null` (C5). Start cap 30 / 10 min. Audit. Originals admin or recordings.manage, logged | C3, C5 |
| T3 | XSS steals the Supabase session (localStorage, lib/http/supabase.ts:5) | No CSP: index.html has none; the host Caddy is not in the repo | CSP Report-Only, then enforce, on the host Caddy (3.7). The media cookie is HttpOnly | ops |
| T4 | Revocation gap (hidden file, unlinked guardian, disabled user) | Checked only at mint; a presigned URL cannot be revoked | Gate on every request; segments ≤ 60 s memo; ≤ 2 MiB per response | C3, C8 |
| T5 | Allowed user saves the bytes (devtools, cURL, extensions) | Untraced | Cannot be stopped. No download UI, nodownload, MSE src (HLS), caps, audit (ip, ua), watermark | C3, C4, C8 |
| T6 | Bypass through Supabase RLS (admin reads rows or signs objects, no audit) | lesson_recordings_admin_read 20261001000189_lesson_recordings.sql:25; storage_recordings_admin_read :33; lesson_recordings_meeting_creator_read 20261005000212_meeting_recordings.sql:18 | Drop all three. No client reads lesson_recordings or the bucket (git grep over apps/*, packages/client-core, mobile-kit: none) | C3 |
| T7 | Scripted range scraping | No limit on any media route | Range required, chunk cap, If-Range ignored, store answer checked (2.4), request caps, start cap | C3 |
| T8 | Ticket replay | Planned ?t= | No web ticket. Compat token for phones only, capped and audited (2.1) | C2, C5 |
| T9 | Stream proxy DoS, socket starvation, slow rolling deploy | One S3 client per copy, SDK default sockets (s3-client.ts:8-19), requestTimeout 60 s | Chunk cap; ≤ 4 open streams per profile per API copy; a separate S3 client for media opens; piped, never buffered; open streams destroyed at shutdown | C1, C3 |
| T10 | Uploaded HTML/SVG/PDF served inline on the API origin | register trusts the client mime (lesson-files.service.ts:48-57) | Families never get originals from cookie routes. Content-Type from a Record allow-list keyed on the DB mime, nosniff, files-host CSP. Original = attachment | C3, C6 |
| T11 | Browser or proxy cache on a shared PC | No Cache-Control on signed GETs (s3-store.ts:115-118) | `Cache-Control: no-store, private` on every /media response | C2 |
| T12 | Service-worker cache | None today (public/sw.js:1-2) | Keep it so; a test pins "no fetch handler" | C4 |
| T13 | Links and bytes fetched before any tap | RecordingsPanel.tsx:33,45-46; LessonParts.tsx:16-21; PortalFileList.tsx:41-42; preload="metadata" AudioPlayer.tsx:31 | preload="none"; only the selected part's player mounts, after the session query; the HLS playlist loads at mount but is not a start | C4 |
| T14 | IDOR | Safe today (portal-scope.ts:26-29) | Same rules in targeted reads; one 404 media_not_found for every miss | C3 |
| T15 | CORS misconfig | WEB_ORIGIN is an unchecked z.string() (env.ts:35) | zod refine: https origins or http://localhost:<port>, no `*` | C2 |
| T16 | Referer and log leak | Files host sends no-referrer (Caddyfile:59) | `Referrer-Policy: no-referrer`; web URLs carry no secret. The compat /media/l token is in a path: ops drops /media/l/* from the host Caddy access log | C2, ops |
| T17 | PDF/image save, print, right-click | New tab at a presigned URL | Stamped JPEG pages in an in-app viewer, ProtectedSurface, print:hidden | C6, C4 |
| T18 | Screen or audio re-recording | Not preventable | Moving watermark (video, file viewer, also in iPhone fullscreen); audit for tracing | C4 |
| T19 | Account sharing | Untraced | media_access keeps ip + ua per slot | C3 |
| T20 | HLS harvesting, key replay | n/a | Key route gated, capped, audited as the start. Segments gated (60 s memo). A signed-in user can still do it (§7). Only family-visible lesson recordings are packed; the rest stay progressive | C8 |
| T21 | Wire or at-rest "sniffing" | TLS only; sources are cleartext in MinIO | HLS segments are AES-128 ciphertext on the wire. At rest nothing changes while the sources stay (owner choice 2) | C8 |
| T22 | Uploader registers another user's object | key {lessonId}/{uuid}.{ext} (lesson-files.mapper.ts:16-18); a re-used path silently returns the old row (lesson-files.repo.ts:63-72) | Key {lessonId}/{profileId}/{uuid}.{ext} with an exact-segments check; a re-used path gets 409 | C7 |
| T23 | Previous user's cookie on a shared browser | No media cookie today; the web-push listener clears only push and tab memories (web-push-session.ts:18-28) | SIGNED_OUT from anywhere calls DELETE /media/session; the session query is keyed by user id, so a new user re-mints at once | C4 |
| T24 | Audit evasion | n/a | ua truncated to 300 chars; the insert fails closed before any byte is piped | C3 |

Not covered: joining the live LiveKit room (that is the room lane).

2. ARCHITECTURE

2.1 Media credential

POST /media/session (media/session/media-session.controller.ts)
- @SignedIn() through the normal AuthGuard (Bearer). No body.
- Answers 200 `{ expires_at }` (mediaSessionSchema, 2.4) and `Set-Cookie: ab_media=v1.<role>.<token>; Path=/media; Max-Age=7200; HttpOnly; Secure; SameSite=Strict`.
  - A 204 would break the web: readJson returns undefined on an empty body (packages/client-core/src/core/http/api-error.ts:14-16) and React Query v5 refuses undefined data.
- token = signPair({ secret: LOGIN_CODE_PEPPER, context: `media-session-v1|${role}` }, { a: sub, b: sub, exp: now + 7200 }). 71 chars (pair-token.ts:3-5).
- Role null (no profile) → 403 media_no_role. Pepper unset → 503 media_unavailable.
- Cap `media-session:<sub>`, 20 / 10 min.
- permissions.coverage.test.ts:29 SIGNED_IN_ONLY gets MediaSessionController.open.

DELETE /media/session
- Method-level @Public() (auth.guard.ts:44-45 reads the handler first).
- Answers 204 with `Set-Cookie: ab_media=; Path=/media; Max-Age=0; HttpOnly; Secure; SameSite=Strict`.

common/http/media-cookie.ts (pure; ≤ 60 lines)
- `mediaCookie({ pepper, user, now })` → the Set-Cookie value; `readMediaCookie({ pepper, header, now })` → `{ id, role } | null`.
- The Cookie header: `z.string().max(8192).optional()` (as report-public.controller.ts:19).
- The value: `/^v1\.([a-z_]{1,32})\.([A-Za-z0-9_-]{48}\.[A-Za-z0-9_-]{22})$/`. Role through `z.enum(USER_ROLES)` (packages/catalog/src/permissions/roles.ts:6). Then verifyPair with the context built from that role; a tampered role fails the signature. `a === b` required.

AuthGuard change (common/auth/auth.guard.ts:37-82)
- New marker `MEDIA_AUTH` + `@MediaAuth()` in decorators.ts.
- authenticate: Bearer first, as today (:74-82). With no Bearer, and only on a @MediaAuth() handler: readMediaCookie → AuthUser { id, role, email: null }; `req.mediaVia = 'cookie'`. Otherwise 401.
- Then the resolver and @Permissions/@SignedIn run unchanged (:50-56). A disabled account → 403 account_disabled (:67).
- 4th constructor parameter `@Inject(MEDIA_COOKIE_KEY) pepper: string | null`, provided in AuthModule from loadEnv().LOGIN_CODE_PEPPER (auth.module.ts:38-58).
- The role in the cookie can lag a role change by ≤ 2 h (the JWT's role lags ≤ 1 h today). Permissions come from the DB per request (db-permission.resolver.ts:22-41, cached 30 s).

Compat link GET /media/l/:token (phones and old builds; removed in the cleanup PR)
- @Public, its own check. Signer `mediaLink({ kind, assetId, profileId })` in common/http/media-link.ts, so reporting (report page, R10) and teaching sign without importing each other.
- Contexts 'media-link|recording', 'media-link|lesson-file', 'media-link|report-file'. a = asset id, b = profile id, exp = now + 3600.
- Param zod `/^[A-Za-z0-9_.-]{70,71}$/`. HMAC first.
- Then profile → role (MediaRepo.profileRole, as db-permission.resolver.ts:25-28) → resolver → the same gate as the asset's cookie route (PortalScopes.of(user), portal-scope.ts:21-25; ReportReaders for report files).
- Counted and audited like the cookie routes, via 'link': media-start, media-req/media-vreq, open-stream cap.
- Minting is capped: `media-link:<profile>`, 30 / 10 min, on the 3 /url routes, R10 and the signed-in report page.
- Range optional. The only route that serves originals to families, with the files-host CSP.
- url = `${apiPublicOrigin()}/media/l/<token>` (public-origin.ts:8-11).

2.2 Routes
Every /media GET: `z.uuid()` ids, every gate miss → 404 media_not_found, headers from 2.5.

Family routes: @MediaAuth() @Permissions('self.portal') (granted to guardian and student only, catalog.data.ts:149; as portal.controller.ts:36 and portal-assets.controller.ts:13); PortalScopes.student runs first (portal-scope.ts:26-30).

| Route | Gate (every request) | Body | Counts |
|---|---|---|---|
| GET /media/portal/students/:studentId/recordings/:recordingId/file | playableRecording | audio/mpeg or video/mp4, Range required | start on first chunk; media-req/vreq |
| …/recordings/:recordingId/hls/index.m3u8 | playableRecording + hlsOn(row) | generated playlist | media-req; no start, no audit |
| …/recordings/:recordingId/hls/key | same | 16 bytes | START (audit + media-start) + media-key |
| …/recordings/:recordingId/hls/s/:seg | same, memoised 60 s | video/mp2t ciphertext | in-memory segment counter |
| GET /media/portal/students/:studentId/lesson-files/:fileId/file | visible_to_family + sentFor(lesson) + mime audio | audio, Range optional | start; media-req |
| …/lesson-files/:fileId/pages | same, but pdf or image; probes when pages is null | JSON lessonFilePagesSchema | media-req |
| …/lesson-files/:fileId/pages/:page | same | image/jpeg, stamped | start (purpose view) on the first page; media-req |

Report attachments, signed in: @MediaAuth() @SignedIn() (any role; ReportReaders answers), media/report/media-report.controller.ts.

| Route | Gate | Body |
|---|---|---|
| GET /media/report-pages/:reportId/attachments/:fileId/file | ReportPageService.attachment({reportId, fileId, user}): find({by:'id'}) + readers.canRead (report-page.service.ts:35-53) + the file in row.attachments + mime audio | audio, Range optional |
| …/attachments/:fileId/pages and /pages/:page | same, pdf or image | stamped pages for guardian and student; clean for staff (`STAMPED: Record<UserRole, boolean>`) |

These three join SIGNED_IN_ONLY.

Report attachments, public code page: @Public, media/report/report-public-media.controller.ts, under the ab_report cookie path (report-session.ts:44-45).

| Route | Gate | Body |
|---|---|---|
| GET /public/report-pages/:publicId/attachments/:fileId/{file, pages, pages/:page} | ReportCodeService.attachment: the view() session check (report-code.service.ts:84-95) + the file in row.attachments | always stamped; viewer = `ip:<ip>`; via 'report'; caps keyed `ip:<ip>`; the 2.5 header set applies here too |

Staff routes: @MediaAuth() + the permission shown.

| Route | Permission + gate | Body |
|---|---|---|
| GET /media/recordings/:recordingId/{file, hls/index.m3u8, hls/key, hls/s/:seg} | recordings.read + lesson gate: LessonFilesAccess.lesson passes (lesson-files.access.ts:15-34), OR StudentRecordingAccess.scopeFor passes for an attending student with onlyTeacherId null or equal to the lesson's teacher (student-recordings.access.ts:29-45, recording-list.service.ts:51-55). Segments memoised 60 s | as the family routes; a meeting row → 404 |
| GET /media/meeting-recordings/:recordingId/file | meetings.read + (admin OR the creator) (recording-list.service.ts:66-71). Meeting rows are never packed, so no HLS routes | progressive; a lesson row → 404 |
| GET /media/recordings/:recordingId/original, /media/meeting-recordings/:recordingId/original | recordings.manage or meetings.read, + role admin | attachment; purpose download; media-download |
| GET /media/lesson-files/:fileId/file | recordings.read + LessonFilesAccess.lesson + audio | audio |
| GET /media/lesson-files/:fileId/pages and /pages/:page | same, pdf or image | CLEAN pages |
| GET /media/lesson-files/:fileId/original | recordings.manage + LessonFilesAccess.lesson | attachment; purpose download |
| POST /media/events (MediaEventsController.create, media/session/media-events.controller.ts) | @SignedIn (Bearer, apiFetch); body mediaEventSchema; the asset row must exist (404 else); cap media-event. Joins SIGNED_IN_ONLY (compared exactly, permissions.coverage.test.ts:46-49). The public code page has no Bearer and sends no event | 204; media_access row, purpose 'devtools' |
| POST /recordings/:id/url (Bearer, @Permissions('recordings.read') on StudentRecordingsController, student-recordings.controller.ts:19) | lesson gate | {url, expires_at} compat link, staff-mobile only (C5) |

The split by target replaces one RECORDING_GATE route: recordings.read is granted to teachers only (T) and meetings.read to teachers, assistants and sales (TAS) (packages/catalog/src/permissions/catalog.data.ts:13,16,64-66; admin holds every grantable permission, db-permission.resolver.ts:38), so one decorator could not carry both. The lesson gate keeps today's reach: the assigned teacher hears other teachers' lessons of that student.

2.3 Targeted reads (new; never the sentLessons scan)
- PortalReportsRepo.playableRecording({studentIds, recordingId}): one query with the rules of portal-reports.repo.ts:103-116 (done, visible_to_student, one-student lesson) and :131-139 (a sent report for that student and lesson).
  - Returns {id, file_path, lesson_id, student_id, media, hls_status, hls_segments, size_bytes, sha256} or null.
  - Exposed via PortalReportsService (people/portal index). recordingUrl (portal-reports.service.ts:55-61) switches to it too.
- PortalReportsRepo.sentFor({studentIds, lessonId}) → student_id | null. Used for lesson files.
- MediaRepo.recording(id) → the row with lesson_id/meeting_id, file_path, hls_*, sha256, size_bytes.
- ReportPageService.attachment and ReportCodeService.attachment: built on find() (report-page.service.ts:48-53), which already loads row.attachments (report-page.types.ts:9-15, 52-54).
- Module edges: media/ imports @/modules/people/portal (as portal-assets.service.ts:7 does) and @/modules/reporting/report-page (exports ReportPageService, index.ts; add ReportCodeService). report-page imports only sales and report-pdf (git grep). Check that neither imports student-recordings before wiring.

2.4 Shared zod (packages/shared/src/reports/lesson-files/media.ts, exported through the folder index)
```ts
export const mediaSessionSchema = z.strictObject({ expires_at: z.iso.datetime() });
export const rangeHeaderSchema = z.string().regex(/^bytes=(?:(\d{1,12})-(\d{0,12})|-(\d{1,12}))$/).optional();
export const hlsSegmentSchema = z.string().regex(/^(0|[1-9]\d{0,4})\.ts$/).transform((s) => Number(s.slice(0, -3)));
export const lessonFilePageSchema = z.coerce.number().int().min(1).max(PDF_PREVIEW_PAGES); // 30, chat-files.ts:72
export const lessonFilePagesSchema = z.strictObject({ pages: z.int().min(1).max(PDF_PREVIEW_PAGES), total_pages: z.int().min(1) });
export const mediaEventSchema = z.strictObject({
  kind: z.literal('devtools'), asset_kind: z.enum(['recording', 'lesson_file', 'report_file']), asset_id: z.uuid(),
});
```
- Lists add `hls: z.boolean()` = hlsOn(row):
  - PortalRecording, lesson-assets.ts:50-59
  - LessonAssetRecording, :15-26
  - StudentRecordingView, packages/schedule/src/classroom/student-recordings.ts:15-30
  - LessonRecordingView, moderation.ts:73
- lessonFileViewSchema (lesson-files.ts:25-35) adds `pages: z.int().min(0).nullable()`.
- reportPageFileSchema (page.ts:40-45) is unchanged.
- Range rules (media/stream/range.ts), all unit-tested:
  - size = size_bytes, or StorageService.info() once when it is null (lesson_recordings.size_bytes is nullable, 20261005000240_student_recordings.sql:12).
  - A Range header that fails the regex, is multi-range, has start > end, a suffix of 0, or start ≥ size → 416 + `Content-Range: bytes */<size>`.
  - Suffix `bytes=-N` → start = max(0, size − N).
  - end = min(end ?? size − 1, start + MEDIA_CHUNK_BYTES − 1, size − 1). The store always gets an explicit `bytes=start-end`.
  - No Range on a recording /file → 400 range_required, unless MEDIA_RANGE_REQUIRED=false.
  - store/read/s3-open.ts: a ranged request that does not come back 206 with exactly that Content-Range → destroy the body, log, 416.

2.5 Response headers (media/stream/media-reply.ts)
Sent on every /media response and every /public/report-pages/:publicId/attachments/… response, errors included:
- `Cache-Control: no-store, private`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Cross-Origin-Resource-Policy: same-site`
- `Content-Security-Policy: default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'`. This is the files-host string exactly (deploy/staging/lb/Caddyfile:60). No sandbox: Chrome refuses PDFs in a sandbox (Caddyfile:57), and the compat link still serves PDFs inline.
- CORS comes from the global enableCors only.

Per route:
- file: 206 (200 only when there is no Range and that is allowed); Accept-Ranges: bytes, Content-Range, Content-Length; Content-Disposition: inline; Content-Type from `MEDIA_MIME: Record<dbMime, header>` (audio/mpeg and video/mp4 for recordings via mediaOfPath, student-recordings.ts:64-66; the audio members of ATTACHMENT_MIMES, packages/shared/src/reports/schema.ts:72-91, for lesson and report files). An unknown mime → 404. `ETag "<sha256>"` once C7 lands; If-Range is ignored.
- playlist: `application/vnd.apple.mpegurl`.
- key: `application/octet-stream`, Content-Length 16.
- segment: `video/mp2t`.
- page: `image/jpeg`, inline.
- original: `Content-Disposition: attachment; filename*=UTF-8''<name>-<YYYY-MM-DD>.<extFor(mime)>` (storage.paths.ts:47). Move the attachment() helper (s3-store.ts:43-44, reporting/exports/csv.ts:37) into common/http/http.ts.

Body handling:
- Bodies are piped, never buffered.
- Request close → AbortController.abort() → the S3 body is destroyed.
- Open streams sit in a Set (media/stream/open-streams.ts), destroyed in beforeApplicationShutdown (stop_grace_period 30 s, deploy/staging/docker-compose.yml:27; main.ts:32-33). The same Set counts per profile: a 5th concurrent stream → 429 too_many_requests.
- No StreamableFile precedent in the repo: use `@Res() reply.send(readable)` (reply style of pay-reply.ts:4-7).

2.6 Audit and caps (media/access/media-audit.ts, MediaRepo)
Order on every route: gate → caps → audit insert (start routes only) → pipe.
- A start is a request with no media_access row for (viewer, asset, purpose, slot = floor(epoch/600)). viewer = the profile id, or `ip:<ip>` on the public report routes.
- Start routes: HLS key, recording /file, lesson-file and report-file audio /file, the first page of a file (purpose view), originals (purpose download).
- Flow: `hasSlot` select → on a miss, `RateLimitRepo.takeOrThrow({buckets:[{key:'media-start:'+viewer, max:30}], windowMs:600_000})` → `insert … on conflict (viewer, asset_id, purpose, slot) do nothing`.
- The insert fails closed: a DB error → 503 media_audit, and no byte is sent. A race between two API copies double-counts one start. Harmless.
- ua = `(req.headers['user-agent'] ?? '').slice(0, 300) || null`. ip = req.ip (trustProxy hops, main.ts:20, app-role.ts:35).

DB caps (rate-limit.repo.ts:25-40; they fail open on a DB error, :31-34, and log it). Over the cap → 429 too_many_requests.

| Bucket | Max / 10 min | Counts |
|---|---|---|
| media-start:<viewer> | 30 | each new slot row, i.e. distinct assets |
| media-req:<viewer> | 120 | audio chunks, pages, playlists (2 MiB × 120 = 240 MiB ≈ 8 h of 64 kbps) |
| media-vreq:<viewer> | 400 | video/mp4 chunks (2 MiB ≈ 11 s at 1.5 Mbps) |
| media-key:<viewer> | 20 | key requests |
| media-download:<profile> | 10 | originals |
| media-session:<profile> | 20 | POST /media/session |
| media-link:<profile> | 30 | compat links minted |
| media-event:<profile> | 10 | POST /media/events |

In-memory caps, per API copy (two copies run, so a client spread over both gets up to 2×):

| Cap | Limit |
|---|---|
| segments per profile | 400 / 10 min (hls_time 6 video ≈ 100 per 10 min at 1×) |
| open streams per profile | 4 |
| segment gate memo | 60 s per `${viewer}|${scope}|${recordingId}` |

- Calibrate on production after the deploy. The numbers live in one Record (media/access/media-caps.ts).
- RateLimitRepo is not global: provide it in MediaModule, as short-links.module.ts:15 does.

2.7 Storage
New port method `ObjectStore.open(o: ObjectKey & { range: {start:number; end:number} | null; signal: AbortSignal })` (object-store.ts:54-78).
- Returns `{ body: Readable; status: 200|206; length: number; size: number; contentRange: string|null } | null`.
- S3: NEW store/read/s3-open.ts. store/ already has 12 code files (bucket-rules, default-source.supabase, list.supabase, object-store, objects.supabase, routing, s3-client, s3-outputs, s3-slot, s3-store, s3.fakes, store-source) and is not in refactor/folder-cap/api.json. GetObjectCommand {Range}. Shared with MinioSource.open (modules/platform/drive-backup/source/minio-source.ts:26-31,66-78) so jscpd stays quiet.
- A second S3Client for opens only, built by s3Client() (s3-client.ts:8-19) with its own agent (keepAlive, maxSockets 24), so media streams cannot take the sockets chat media, receipts and PDF previews use.
- Supabase: createSignedUrl(key, 60) + fetch with Range + Readable.fromWeb (the objects.supabase.ts:58-62 pattern).
- Do not use orMissing for 416 (s3-outputs.ts:28-29).
- S3Store.remove sends one DeleteObject per key in one Promise.all (s3-store.ts:85-90): batch it in chunks of 50.

StorageService:
- StorageService.open(ref & {range, signal}), routed by the marker (storage.service.ts:27-31). The file is at 150/150 lines; pay with its doc lines :14-18.
- requestTimeout 60 s (s3-client.ts:18) cuts a paused, backpressured body. The route destroys the reply and the player re-requests with Range.

Paths: NEW common/storage/storage.media-paths.ts (storage.paths.ts is at 149 lines), re-exported through the storage index, with the rule comment of storage.paths.ts:4-5. It holds lessonFileViewPath, lessonFileViewPrefix, reportFileViewPath, reportFileViewPrefix, hlsSegmentPath and isLessonFileOf (exact segments).

Bucket `recordings` (prefix m.bucketPrefix, s3-client.ts:37):
- lessons/<lesson>/<ts>.mp3|.mp4: the source, kept (owner choice 2);
- meetings/<id>/…;
- NEW hls/<recording_id>/<n>.ts: ciphertext, in the same store as the source;
- BUCKET_RULES.recordings adds video/mp2t (bucket-rules.ts:36).

Bucket `report-attachments`:
- lesson file: {lessonId}/{profileId}/{uuid}.{ext} (C7);
- lesson-file pages: {lessonId}/view/{fileId}/clean/{page}.jpg and {lessonId}/view/{fileId}/s/{studentId}/{page}.jpg;
- report-file pages: {reportId}/view/{fileId}/clean/{page}.jpg and {reportId}/view/{fileId}/s/{page}.jpg (one student per report);
- backups skip `/view/`: backup.sh:38 `mc mirror --exclude '*/view/*'` for report-attachments, and the Drive pending list skips keys containing `/view/` (backup-run.ts:22, reviewer). Pages re-render from the originals.

Egress put-only MinIO user:
- Narrow its Resource to <prefix>recordings/lessons/* and <prefix>recordings/meetings/*, so it cannot overwrite hls/.
- A docs/45 §1a edit, plus the owner re-running docs/45:79-81. Egress paths: egress-request.ts:9-12.

2.8 Encrypted HLS pipeline (C8; MEDIA_HLS=false until turned on)

hlsOn (media/hls/hls-on.ts): `env.MEDIA_HLS && kekLoaded && row.hls_status === 'ready'`. The 4 list mappers and every HLS route use it; false → lists say hls:false, HLS routes 404, the web plays /file.

Job hls-pack (media/pack/):
- `@BackgroundJob({ name: 'hls-pack', kick: 'kick' })`, worker only (app-role.ts:24-25).
- First run HLS_PACK_FIRST_MS after boot (default 20 min, as recording-maintenance.job.ts:6-8; 1000 in e2e), then every 2 min. ONE row per run.
- Kicked after finishByEgress (livekit-webhook.service.ts:40-41); API copies forward the kick (worker-kick.ts:64-72). The claim's live-room condition makes a kick during lesson starts a no-op.
- Store rule: runs only when `storage.writesTo() === 'supabase' || storage.recordsToMinio()` (storage.service.ts:46-58). It claims rows whose source is in the active store, so segments land next to their source: no copy from Supabase onto the shared disk while MINIO_RECORDINGS is off, and CI (Supabase store) still packs.
  - Production runs the minio driver; its MINIO_RECORDINGS value is not in the repo. With it off, HLS never packs there (owner choice 7).
- Gate: MEDIA_HLS true, MEDIA_KEK set and the store rule true. Otherwise one boot warning naming the missing piece, and the rows wait.

Claim (HlsPackRepo; the CAS is the dedup):
```sql
update lesson_recordings set hls_status = 'packaging', hls_claimed_at = now(), hls_attempts = hls_attempts + 1
where id = (
  select id from lesson_recordings
  where status = 'done' and hls_status = 'pending' and visible_to_student and lesson_id is not null
    and (file_path like 'minio:%') = $1          -- $1: the active store is MinIO
  order by ended_at desc limit 1 for update skip locked)
  and not exists (select 1 from lesson_recordings
    where status = 'recording' and started_at > now() - interval '6 hours')
returning id, file_path, size_bytes;
```
- Row transitions (`PACK_OUTCOME: Record<Outcome, update>`):
  - success → 'ready' (step 10);
  - a caught ffmpeg, parse or upload failure → 'pending' with hls_error set; the attempt counts;
  - attempts ≥ 3 → 'failed' with hls_error;
  - too little /tmp space (step 2) → 'pending' and `hls_attempts = hls_attempts - 1`;
  - over 1 GiB → 'skipped' with hls_error 'too_large';
  - 'packaging' older than 15 min → 'pending' with `hls_attempts = hls_attempts - 1` (a deploy that stops the worker, roll.sh:97 (reviewer), does not use up an attempt).
- Visibility on: RecordingAdminRepo.setVisible (recording-visibility.service.ts:25-27) also sets `hls_status = 'pending'` when it is 'skipped' with hls_error null. That is how an old row gets packed.

Steps (one row at a time):
1. First pass after boot: `rm -rf /tmp/hls-*` (a node OOM kill skips `finally`).
2. Over 1 GiB → 'skipped'. fs.statfs('/tmp'): free < 3 × size → back to 'pending' with the attempt given back, log, stop this run.
3. Stream the source with StorageService.open into mkdtemp('/tmp/hls-<id>-')/src (stream.pipeline). Never use get(): it buffers (s3-store.ts:61-63).
4. key = randomBytes(16), iv = randomBytes(16). Write <MEDIA_HLS_KEY_DIR>/<id>.key (0600; default /run/hls-keys, a worker tmpfs) and <id>.keyinfo (3 lines: `key`, the key path, the iv in hex).
5. execFile, no shell, SIGKILL after 10 min:
```
env -i PATH=/usr/bin:/bin nice -n 19 ionice -c 3 choom -n 1000 -- prlimit --as=536870912 -- \
ffmpeg -nostdin -hide_banner -loglevel error -protocol_whitelist file -f {mp3|mov} -i <dir>/src \
  -map 0:a:0 [-map 0:v:0 -c:v copy] -c:a aac -b:a 64k -threads 1 \
  -f hls -hls_time {30|6} -hls_playlist_type vod -hls_list_size 0 -start_number 0 -hls_segment_type mpegts \
  -hls_key_info_file <MEDIA_HLS_KEY_DIR>/<id>.keyinfo -hls_segment_filename <dir>/out/%d.ts <dir>/out/index.m3u8
```
   - `HLS_TIME: Record<Media, number>` = {audio: 30, video: 6}: about 90 objects of ~240 KB for a 45-min audio lesson instead of 450.
   - MEDIA_HLS_AUDIO=copy replaces `-c:a aac -b:a 64k` with `-c:a copy`.
   - `-f` fixes the demuxer. `-protocol_whitelist file` stops any URL.
   - nice and ionice order work inside the worker's cgroup only (ionice needs BFQ; the VPS scheduler is not in the repo). The cross-container lever is `cpu_shares: 256` on ayat-worker (owner choice 5).
6. Unlink <dir>/src as soon as ffmpeg exits.
7. parseFfmpegPlaylist (zod over the lines): MEDIA-SEQUENCE 0, every KEY line equal to `METHOD=AES-128,URI="key",IV=0x<iv>`, EXTINF for 0.ts…(n-1).ts. Returns number[].
8. Upload each segment, one after another, to recordings/hls/<id>/<n>.ts as video/mp2t (StorageService.upload = the active store = the source's store).
9. Upsert recording_media_keys.
10. `update set hls_status='ready', hls_segments=$d, hls_error=null where id=$1 and hls_status='packaging'`. 0 rows (deleted meanwhile) → remove the segments and the key row.
11. finally: rm -rf the temp dir and unlink both key files.

A retry makes a new key and overwrites every segment before the row reaches 'ready'.

Playlist (media/hls/playlist.ts): generated from hls_segments, never stored.
`#EXTM3U / #EXT-X-VERSION:3 / #EXT-X-TARGETDURATION:<ceil(max)> / #EXT-X-MEDIA-SEQUENCE:0 / #EXT-X-PLAYLIST-TYPE:VOD / #EXT-X-KEY:METHOD=AES-128,URI="key",IV=0x<iv> / #EXTINF:<d>,\ns/<n>.ts … / #EXT-X-ENDLIST`
Relative URIs resolve under the same /media path, so the cookie path covers them.

Keys (media/hls/media-key.ts):
- key_enc = AES-256-GCM(MEDIA_KEK, AAD = recording_id), laid out as iv12‖ct16‖tag16 = 44 bytes. kek_version 1.
- The key never goes to object storage. In the DB it is useless without the KEK.
- The KEK is not derived from the pepper: rotating the pepper must not brick stored keys.
- An unwrap failure (a changed or wrong KEK) sets that row to hls_status 'failed', hls_error 'kek', and answers 404. It keeps hls_segments, the segments and the key row. The next list says hls:false and the web plays /file (the source is still there). With the right KEK back: `update lesson_recordings set hls_status = 'ready', hls_error = null where hls_status = 'failed' and hls_error = 'kek';`
- MEDIA_KEK is NOT added to the deploy's env merge (deploy-staging.yml:301-305): a set GitHub secret replaces the server value (docs/09-deployment.md:421) and cannot be read back. The owner sets it by hand once in the server .env (`openssl rand -base64 32`) and keeps an offline copy. Not in Vault, like the peppers.

Lifecycle: RecordingEraser.erase (recording-eraser.ts:45-48) also removes hls/<id>/0..n-1.ts (batches of 50) and deletes the key row, then markDeleted.

CPU and disk:
- A copy remux is about 1-2 s per 45-min lesson. AAC is about 20-40 s at nice 19 on one thread (estimate). Measure with docker stats; whether egress admission measures host-wide CPU or its own cgroup: not found.
- ayat-worker is the only job runner (deploy/staging/docker-compose.yml:58-73), 512 MB heap, 1024M limit. hls/ goes into the docs/45 disk watch.

Compose and env:
- ayat-worker: `tmpfs: ["/run/hls-keys:size=64k,mode=0700,uid=1000,gid=1000"]`.
- MEDIA_HLS, MEDIA_HLS_AUDIO, MEDIA_KEK, MEDIA_CHUNK_BYTES, MEDIA_RANGE_REQUIRED go in the server .env, which every app service reads (env_file: .env, docker-compose.yml:23). The API copies need MEDIA_HLS and MEDIA_KEK too (hlsOn, key route).

Dockerfile smoke (after :43, same env/nice/choom/prlimit chain):
- lavfi 3 s anullsrc → MP3;
- the exact args above with a fixed key and iv, and `-hls_time 1`;
- `grep -q '^#EXT-X-KEY:METHOD=AES-128,URI="key",IV=0x<iv>$'`;
- node decrypts the LAST segment with createDecipheriv('aes-128-cbc', key, iv) and checks that the first byte is 0x47 (TS sync).

2.9 Integrity job (C7, plan B; media/integrity/)
- `@BackgroundJob({ name: 'media-integrity', kick: 'kick' })`. First run 20 min after boot, then hourly. Kicked after finishByEgress.
- Claim 10 rows with `status='done' and sha256 is null and integrity_failed_at is null`.
- Hash with StorageService.open → createHash('sha256') through stream/promises pipeline.
- `update … set sha256=$h, integrity_checked_at=now() where id=$id and sha256 is null`. The where clause is the dedup.
- A missing or unreadable object sets integrity_failed_at, so it is not claimed again.
- Re-check: only «minio:» paths with `integrity_checked_at < now() - interval '7 days'` (plan B3 says weekly), oldest first, ≤ 500 MiB per run. Supabase reads are billed egress (docs/09-deployment.md:214, reviewer).
- A mismatch sets integrity_failed_at, shown as a staff status only (no notification).
- Lesson files: hash inside register (≤ 25 MiB). The same (lesson_id, sha256) → remove the new object and return the existing row. Store the real size and type from info() (s3-store.ts:73-78), not the body's values (lesson-files.service.ts:48-57).
- Report attachments: no sha256 in this work (register already sniffs the type, report-files.service.ts:64-71).

3. WEB CLIENT (apps/staff-web)

3.1 Dependencies (exact pins)
- `"@videojs/react": "10.2.0"`, `"@videojs/hlsjs-video": "10.2.0"` (brings hls.js 1.6.19), `"disable-devtool": "0.3.9"`.
- pnpm-lock.yaml comes from a cloud session (`pnpm i`), never the owner's PC. Deploy builds use --frozen-lockfile (Dockerfile:11).
- Imports (compat reviewer, read on unpkg 10.2.0):
  - `import { Audio } from '@videojs/react/audio'` and `import { Video } from '@videojs/react/video'` (presets re-export them; `@videojs/react/media/audio` does not resolve, because `./media/*` maps to `dist/default/media/*/index.js`).
  - `HlsJsVideo` from `@videojs/react/media/hlsjs-video`.
  - `createPlayer({ features })` → `{ Player, usePlayer, useMedia }` (player/create-player.d.ts); `audioFeatures` and `videoFeatures` from the presets; PlayButton, SeekButton, Time, PlaybackRateButton, FullscreenButton, I18nProvider in the root. Video.js has an 'ar' locale; feed I18nProvider from ar.json/en.json.
  - HlsJsVideo props: src, source, preload, streamType, disableRemotePlayback. Default hls.js config: autoStartLoad false, backBufferLength 30, capLevelToPlayerSize true.

3.2 Session hook
- client-core packages/client-core/src/teaching/lesson-files/media-session.ts:
  - `open()` = mediaSessionSchema.parse(await apiFetch('/media/session', {method:'POST', credentials:'include'})). apiFetch passes init through (core/http/api-client.ts:40).
  - `close()` = the same with DELETE and `signal: AbortSignal.timeout(3000)`. apiFetch has no deadline (:32-44).
- lesson-files/player/use-media-session.ts: `useQuery({ queryKey: ['media-session', userId], queryFn: mediaSession.open, staleTime: 600_000, refetchInterval: 600_000, refetchIntervalInBackground: true, refetchOnWindowFocus: true })`.
  - Without refetchIntervalInBackground, query-core runs the interval only while focused (queryObserver.js:294, reviewer).
  - Players mount only after the query succeeds.
- Sign-out:
  - signOut (features/people/auth/sign-in.ts:115) calls `void mediaSession.close()` before supabase.auth.signOut, never awaited.
  - The onAuthStateChange listener (web-push-session.ts:18-28) also calls it on SIGNED_OUT (expired refresh, another tab). On a user switch it does not: the new userId key re-mints at once, and a DELETE could race the new cookie.

3.3 Player (lesson-files/player/, every file ≤ 150 lines)
- media-urls.ts (client-core): `MEDIA_BASE: Record<'portal'|'lesson'|'meeting'|'report'|'publicReport', (ids) => string>`. `.file`, `.hls` (= /hls/index.m3u8), `.pages`, `.page(n)` and `.original` hang off it.
- playback-mode.ts (inside the lazy chunk; it imports hls.js):
  - `canHls = Hls.isSupported() || canPlayNativeHls()`, where canPlayNativeHls = `document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== ''`;
  - `SOURCE: Record<'hls' | 'file', (row, urls) => Source>`, keyed by `row.hls && canHls ? 'hls' : 'file'`.
  - No preferPlayback: the adapter already picks MSE when Hls.isSupported() and native otherwise (hlsjs-video adapter.js:212, reviewer).
- hls-config.ts, a module constant so the engine is never rebuilt: `export const HLS_ENGINE = { xhrSetup: (xhr: XMLHttpRequest) => { xhr.withCredentials = true; }, maxBufferLength: 30, maxMaxBufferLength: 60, backBufferLength: 30 } as const;` (request-credentials.js runs the consumer's xhrSetup, reviewer).
- MediaPlayer.tsx: `const MEDIA = { hls: HlsJsVideo, audio: Audio, video: Video }`.
  - Props come from `MEDIA_PROPS: Record<Kind, props>`: all kinds get preload="none" and controlsList="nodownload noplaybackrate noremoteplayback"; video and hls also get playsInline, disablePictureInPicture and disableRemotePlayback (iOS ManagedMediaSource needs it). @types/react puts those three on VideoHTMLAttributes only (index.d.ts:3583-3589, reviewer), so <Audio> with them fails typecheck.
  - crossOrigin is absent or 'use-credentials', never 'anonymous'.
  - Audio-only HLS plays in HlsJsVideo with the video box hidden.
  - The src is set at render (it holds no secret), so the press calls play() synchronously, as iOS requires.
  - HlsJsVideo loads the playlist at mount even with preload="none" (hls-js-only.js `set src` → loadSource, reviewer); fragments and the key wait for play. So: mount after the session, only the selected part.
- PlayerBar.tsx: custom controls inside `<Player>`: play, ±10 s (SeekButton), the existing SeekBar, an LTR time island, rate 1× / 1.5× / 2×, and fullscreen for video only. Tailwind tokens; labels in packages/shared/i18n/ar.json and en.json (MSA). No stock skin.
  - SeekBar.tsx stays: it is RTL-aware and tested (SeekBar.tsx:14-20, 32, client-core seekAtPoint/seekByKey). It reads currentTime/duration through a usePlayer selector and seeks through the store. The Video.js TimeSlider is not used: it maps (clientX − rect.left)/width and ArrowRight = +step (core slider.js:148-152, pointer.js, reviewer), wrong in the RTL app (index.html:2).
  - Fullscreen: when `document.fullscreenEnabled` is false (iPhone), the control toggles a `fixed inset-0` page fullscreen of the container. A `webkitbeginfullscreen` event calls `webkitExitFullscreen()`. Video.js would otherwise call webkitSetPresentationMode('fullscreen'), the native player, which draws no overlay (core presentation/fullscreen.js, reviewer). A test pins that the control never calls webkitEnterFullscreen.
- use-resume-position.ts replaces the frozen startAt (use-html-audio.ts:38,55). The live position sits in a ref and is applied at every loadedmetadata. ListenState (client-core resume.ts) stays.
- use-media-recovery.ts: a media error or an hls.js fatal NETWORK error triggers, once: invalidate ['media-session', userId] → refetch → reload the source → seek to the saved position → play. A second failure shows the error line.
- Voice notes (lesson files and report attachments) use the same MediaPlayer, as `<Audio src={fileUrl} preload="none">`.
  - A play() rejected with NotAllowedError shows «اضغط للتشغيل» once.
  - If the iPhone test shows no cookie on media requests (3.4), fall back to `fetch(fileUrl,{credentials:'include'})` → a blob URL, with the same «اضغط للتشغيل».
- Lazy-load the player at each mount (E4).
- Remove AudioPlayer.tsx, PlayerButtons.tsx and use-html-audio.ts. AudioPlayer.test.tsx becomes the MediaPlayer tests.
- Replace their users:
  - portal recordings/RecordingPlayer.tsx, both exports (the mint-on-mount at :8,17-23 goes);
  - lesson-files/RecordingItem.tsx:28;
  - students/recordings/RecordingPlayer.tsx:19-34;
  - classroom/recordings/RecordingsPanel.tsx:21-32 (lesson or meeting base). Its «تنزيل» (admins only) is an anchor to …/original whose onClick first awaits `queryClient.fetchQuery` of the session (refetched when older than 10 min), then `location.assign(url)`. Without that an expired cookie replaces the app with a 401 page;
  - reporting/report-page/ReportPageFiles.tsx:14-20: audio → MediaPlayer, pdf/image → FileViewer, base 'report' when signed in and 'publicReport' on the code page. The `url` field is no longer read.
- Delete use-recordings.ts:16-37 (the url queries) and the recording new-tab path, report/FileButtons.tsx:24-27 → open-file.ts:12. These go in C4, with C5's server change in PR B.
- Mount only the selected part's player (RecordingsPanel.tsx:33,45-46, LessonParts.tsx:16-21). Voice notes are compact rows that load on press.

3.4 iOS and browser matrix

| Browser | Recording | Voice note | Pages |
|---|---|---|---|
| Chrome, Edge, Firefox desktop; Android Chrome | hls.js over MSE (when hls), else progressive <audio>/<video> | <audio> + cookie | <img> + cookie |
| iOS 17.1+ Safari | hls.js over ManagedMediaSource (disableRemotePlayback) | <audio> + cookie (UNVERIFIED) | <img> |
| iOS < 17.1 | native HLS with the cookie: UNVERIFIED (AVFoundation) | <audio> + cookie (UNVERIFIED) | <img> |
| no MSE and no native HLS | progressive <audio> with the cookie | <audio> + cookie | <img> |

If the iPhone test shows no cookie on native media requests, first try SameSite=Lax. If there is still none, add a single-asset path token for that mode only (pair-token, as /media/l), with exp = now + duration_seconds + 15 min, accepted on segments too. It is not built unless the device test fails.

Device checks: a 45-minute audio with the screen locked, once per mode (progressive, ManagedMediaSource, native).

3.5 Watermark and protection (lesson-files/protect/)
Watermark.tsx:
- Label: family `<students.code> · <YYYY-MM-DD>` (PortalStudent.code, portal-scope.repo.ts:18); staff `<display name> · <date>` from /auth/me.
- About 0.12 opacity, a CSS keyframe move every 20 s, pointer-events-none, aria-hidden.
- Rendered INSIDE the player container (which is also the page-fullscreen element), and over the file viewer.

ProtectedSurface.tsx:
- preventDefault on contextmenu, dragstart and selectstart.
- Class `select-none [-webkit-touch-callout:none] print:hidden`.

use-protect-keys.ts + protect-keys.ts: a Record of blocked combos (F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U/S/P), active only while a protected surface is mounted.

use-devtools-guard.ts (C9):
- disable-devtool 0.3.9, initialised ONCE with `{ disableMenu: false, disableSelect: false, clearLog: false, ondevtoolopen, ondevtoolclose, detectors: [...] }`. The detector list is explicit, with no Debugger detector and no size-based one. Its defaults block right-click app-wide (disableMenu true, README:218) and redirect on detection unless ondevtoolopen is given (README:213, 229) (reviewer).
- There is no stop API: on unmount set `DisableDevtool.isSuspend = true`, on mount false. The callbacks call a module-level set of listeners.
- On detection: pause every player, blur the content under «أغلق أدوات المطوّر لمتابعة المشاهدة», and POST /media/events once. Clear the overlay when devtools close. Never sign the user out. Never app-wide.
- Off switch: «القيم» boolean `media_devtools_guard` (default on), read by the hook. The web's settings read path for families: not checked (#745 mentions a public settings hook); read it before C9.

3.6 File viewer (lesson-files/viewer/)
Files: FileViewer.tsx, PageImage.tsx, ViewerPager.tsx, ViewerState.tsx, use-file-view.ts. Used for lesson files and report attachments.
- GET …/pages gives {pages, total_pages}.
- `<img src="${api}/media/…/pages/${n}" draggable={false} className="select-none [-webkit-touch-callout:none]">` (public report: `/public/report-pages/:publicId/attachments/:id/pages/${n}`).
- onError: invalidate the session once, then retry (the PdfCard.tsx:29-40 pattern).
- Dialog layout="center" with className="print:hidden" (dialog.tsx:32-36).
- RTL pager keys.
- «تُعرض أول 30 صفحة من n».
- Error states from a Record<code, {text, retry}>.

Changes to existing files:
- PortalFileList.tsx:41-53: pdf and image rows open FileViewer. A pages===0 row shows «لا يمكن عرض هذا الملف هنا» and has no «فتح».
- Staff LessonFileItem.tsx:28-31: «فتح» opens the viewer (clean pages); «تنزيل» uses the refresh-then-navigate anchor to …/original.
- Delete useLessonFileUrl / useOpenLessonFile (use-recordings.ts:23-37) and useOpenFile (use-lesson-files.ts:37-41).

3.7 CSP for app.ayatalbayan.com (host Caddy, NOT in the repo: an owner/ops step)
- Send it as a header: a meta tag can do neither Report-Only nor frame-ancestors.
- Ship `Content-Security-Policy-Report-Only` first, then enforce:
  `default-src 'self'; script-src 'self' 'sha256-<hash of index.html:17-24 theme script>'; connect-src 'self' https://api.ayatalbayan.com https://<project>.supabase.co wss://<project>.supabase.co wss://<livekit host> https://files.ayatalbayan.com; media-src https://api.ayatalbayan.com blob:; img-src 'self' data: blob: https://api.ayatalbayan.com https://files.ayatalbayan.com; frame-src https://files.ayatalbayan.com https://<project>.supabase.co; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`
- frame-src keeps the receipt and invoice iframes (ReceiptDialog.tsx:24, InvoiceDialog.tsx:35).
- connect-src keeps the upload PUT to the files host (packages/client-core/src/core/http/signed-upload.ts:4).
- style-src and font-src were not inventoried; do that first.
- Same host Caddy: a 308 from the sslip.io web host to https://app.ayatalbayan.com before C4 (keep the sslip.io API host for old Android builds), and no access log for /media/l/*.

4. LESSON FILES AND REPORT ATTACHMENTS: SERVER-RENDERED WATERMARKED PAGES (C6)
Pixels are decoded only in the ayat-pdf sandbox, never in an API copy (docs/09 «PDF sandbox»). The sandbox does not move.

Sandbox changes in apps/api/src/modules/messaging/inbox/files/pdf/ (9 code files → 11):
- pdf-sandbox.handler.ts parseOp (:17-26) gets `POST /image` and `POST /stamp?label=…`.
  - The label must match `/^AB-\d{4,} \d{4}-\d{2}-\d{2}$/`, else 400. It goes in as an argv element, never through a shell.
- The body cap (:49-50) becomes a per-op Record: INVOICE_MAX_BYTES (10 MiB) for pages, render and image; 2 MB for stamp.
- pdf-render.ts:45-61: spawnPoppler → spawnTool(tool, args), with TIMEOUT_MS {pdfinfo 5 s, pdftoppm 20 s, ffmpeg 15 s} and an address-space cap per tool. inSlot (:70-83) stays: one run at a time.
- New image-tool.ts:
  - imageArgs: `-max_pixels 16000000`, long side scaled to 1600, `-q:v 4 -map_metadata -1` (strips EXIF and GPS), `-threads 1 -filter_threads 1`;
  - stampArgs: NO canvas and NO rotate. A chain of `drawtext` filters at fixed grid positions directly on the page (≤ 1600 px), fontfile=/usr/local/share/stamp-font.ttf, black@0.13, `-threads 1 -filter_threads 1`. Only the page frame is in memory; a 2600² RGBA canvas is 27 MB per frame against a 128M container whose /tmp tmpfs counts too (docker-compose.yml:121-123, 144-147).
- pdf-client.ts adds reencodeImage(bytes, mime) → Uint8Array | null (null = no preview) and stampPage(jpg, label).
- New sandbox-guard.ts: FailedRecently, sandboxReady and the 503 map, extracted from pdf-preview.service.ts:13-16,37-39,106-121.
- inbox/index.ts exports what lesson files use.

FilePagesService (student-recordings/lesson-files/view/file-pages.service.ts), shared by lesson files and report attachments through a `PAGE_SOURCE: Record<'lesson_file'|'report_file', {repo, paths}>`:
- Every read of an original plus its sandbox call runs inside inSlot, as PdfPreviewService does (pdf-render.ts:66-69): a waiting request holds no bytes.
- probe on the first view, not at register: pdfinfo for a PDF, or /image + store clean page 1 for an image. Then setPages; the first writer wins (`.is('pages', null)`, as PdfPreviewRepo.setDoc, pdf-preview.repo.ts:25-32).
- clean(page): renders runs of 5 pages (pageRange, pdf-pages.ts:14-18), deduped with InFlight.
- stamped({row, page, student}): read the cache; otherwise clean → stampPage → upload. One stamp per (file, student, page), ever.
- remove: storage.removePrefix.

Other pieces:
- stamp-label.ts builds `AB-1234 2026-11-17` from the student code and the LESSON's local date in the student's tz (Intl en-CA). PortalScopes.student gives code + tz (portal.ts:12-20); the report's facts give code, tz and starts_at (report-page.service.ts:69-73).
- Lesson-file remove: removePrefix(view prefix) → the original object → the row. Report attachment remove (report-files.service.ts:74-80) also removes its view prefix.
- Upload cap: lesson-file pdf and image ≤ 10 MiB (sandbox cap), via a superRefine on lessonFileUploadSchema and lessonFileRegisterSchema → 'lesson_file_view_too_large'. Audio stays at 25 MiB. A report attachment over 10 MiB gets pages=0.

Fail closed: the family never gets the original from a cookie route.

| Case | Answer | UI |
|---|---|---|
| encrypted, broken or HEIC (pages=0) | 422 lesson_file_no_preview | «لا يمكن عرض هذا الملف هنا» |
| sandbox down, or no sandbox (CI, dev) | 503 pdf_unavailable | «العرض غير متاح الآن. حاول بعد قليل.» + retry |
| queue full | 503 pdf_busy | back-off retry |
| render failed | 503 pdf_render_failed; that page run is refused for 10 min | retry later |
| page > min(pages, 30) | 400 page_out_of_range | none |
| hidden or removed | 404 media_not_found | «هذا الملف لم يعد متاحًا» |
| caps | 429 | «محاولات كثيرة. حاول بعد دقائق» |

Dockerfile smoke (through spawnTool's exact chain and runtime --as cap):
- `f=$(find /usr/share/fonts -name 'Amiri-Regular.ttf' -print -quit) && test -s "$f" && ln -s "$f" /usr/local/share/stamp-font.ttf` (ayat-pdf's root is read-only; fontconfig's fc-match is not installed, Dockerfile:31);
- imageArgs on a 4000×4000 lavfi input; stampArgs on a 1600 px lavfi page; `test -s` each.
- ayat-pdf stays at 128 MB / 1 CPU. Watch docker stats on a 16 MP decode. The build smoke runs outside the cgroup, so it proves the flags, not the memory.

Plan D guards (C7):
- The lesson-file key becomes {lessonId}/{profileId}/{uuid}.{ext} (lesson-files.mapper.ts:16-18), checked by isLessonFileOf (exact segments, modelled on isChatOutPathOf, storage.paths.ts:127-133), segment 2 = the caller's id.
- Drop ignoreDuplicates (lesson-files.repo.ts:63-72): a re-used path gets 409 lesson_file_exists.
- AuditService.record (audit.service.ts:22) on add, visibility and remove.

5. MIGRATIONS, ENV, CONFIG
Slots 20261117100210-240. feat/family-room-and-home holds 100100-100170.
CLASH: 20261117100100 exists on both branches (family_lesson_requests vs lesson_room_end). Rename one before the second merge.
packages/db/src/types.ts is edited by hand; the e2e SQL spec proves it. Local Postgres is 17 (packages/db/supabase/config.toml:41).

20261117100210_media_access.sql (C3)
```sql
create table if not exists public.media_access (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  viewer text not null check (char_length(viewer) <= 64),   -- profile uuid, or 'ip:<ip>' (public report page)
  asset_kind text not null check (asset_kind in ('recording','lesson_file','report_file')),
  asset_id uuid not null,
  student_id uuid references public.students (id) on delete set null,
  purpose text not null check (purpose in ('play','view','download','devtools')),
  slot integer not null,                       -- floor(epoch / 600): the dedup key
  via text not null check (via in ('cookie','bearer','link','report')),
  ip inet,
  ua text check (char_length(ua) <= 300),      -- the API truncates before insert
  created_at timestamptz not null default now()
);
create unique index if not exists media_access_slot_uq on public.media_access (viewer, asset_id, purpose, slot);
create index if not exists media_access_actor_idx on public.media_access (actor_id) where actor_id is not null;
create index if not exists media_access_asset_idx on public.media_access (asset_id, created_at desc);
create index if not exists media_access_student_idx on public.media_access (student_id) where student_id is not null;
alter table public.media_access enable row level security;
create policy media_access_admin_read on public.media_access for select to authenticated
  using ((select public.is_admin()));
revoke all on public.media_access from anon, authenticated;
grant select on public.media_access to authenticated;
grant all on public.media_access to service_role;
-- T6: the API reads with the service role; no client reads these (git grep)
drop policy if exists lesson_recordings_admin_read on public.lesson_recordings;
drop policy if exists lesson_recordings_meeting_creator_read on public.lesson_recordings;
drop policy if exists storage_recordings_admin_read on storage.objects;
```
`viewer` keeps the dedup working for public viewers (actor_id null) and never collides when a deleted profile's rows go to null.

20261117100220_file_pages.sql (C6)
```sql
alter table public.lesson_files add column if not exists pages integer
  check (pages is null or pages between 0 and 100000);
alter table public.report_attachments add column if not exists pages integer
  check (pages is null or pages between 0 and 100000);
comment on column public.lesson_files.pages is
  'Family view: null = not probed, 0 = no preview (encrypted, broken, HEIC, > 10 MiB), n = pages (image = 1).';
comment on column public.report_attachments.pages is 'As lesson_files.pages.';
```

20261117100230_media_sha256.sql (C7)
```sql
alter table public.lesson_recordings
  add column if not exists sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  add column if not exists integrity_checked_at timestamptz,
  add column if not exists integrity_failed_at timestamptz;
create index if not exists lesson_recordings_sha_pending_idx
  on public.lesson_recordings (ended_at desc)
  where status = 'done' and sha256 is null and integrity_failed_at is null;
alter table public.lesson_files add column if not exists sha256 text check (sha256 ~ '^[0-9a-f]{64}$');
create unique index if not exists lesson_files_lesson_sha_uq
  on public.lesson_files (lesson_id, sha256) where sha256 is not null;
```

20261117100240_recording_hls.sql (C8)
```sql
-- Existing rows: 'skipped' (no archive re-encode on deploy). New rows: 'pending'. Both defaults are
-- constants: no rewrite, no backfill.
alter table public.lesson_recordings
  add column if not exists hls_status text not null default 'skipped'
    check (hls_status in ('pending','packaging','ready','failed','skipped')),
  add column if not exists hls_segments real[]
    check (hls_segments is null or cardinality(hls_segments) between 1 and 5000),
  add column if not exists hls_attempts smallint not null default 0,
  add column if not exists hls_claimed_at timestamptz,
  add column if not exists hls_error text check (char_length(hls_error) <= 500);
alter table public.lesson_recordings alter column hls_status set default 'pending';
alter table public.lesson_recordings add constraint lesson_recordings_hls_ready_chk
  check (hls_status <> 'ready' or hls_segments is not null) not valid;
alter table public.lesson_recordings validate constraint lesson_recordings_hls_ready_chk;
create index if not exists lesson_recordings_hls_pending_idx
  on public.lesson_recordings (ended_at desc)
  where status = 'done' and hls_status = 'pending' and visible_to_student and lesson_id is not null;
create table if not exists public.recording_media_keys (
  recording_id uuid primary key references public.lesson_recordings (id) on delete cascade,
  kek_version smallint not null default 1,
  key_enc bytea not null check (octet_length(key_enc) = 44),
  iv bytea not null check (octet_length(iv) = 16),
  created_at timestamptz not null default now()
);
alter table public.recording_media_keys enable row level security;   -- no policy: service role only
revoke all on public.recording_media_keys from anon, authenticated;
grant all on public.recording_media_keys to service_role;
```
NOT VALID + VALIDATE keeps the lock short. The live-room check in the claim reads the existing one-recording-per-lesson partial indexes (tools/livekit/README.md:28).

Env: apps/api/src/config/env/env.media.ts, spread into env.ts:86-89. Also add to apps/api/.env.example and the docs/09 table + «Stays in env» (:326).
```ts
MEDIA_KEK: z.preprocess(blankIsUnset, z.base64().refine((s) => Buffer.from(s, 'base64').length === 32).optional()),
MEDIA_HLS: z.preprocess(blankIsUnset, z.stringbool().default(false)),
MEDIA_HLS_AUDIO: z.preprocess(blankIsUnset, z.enum(['aac', 'copy']).default('aac')),
MEDIA_CHUNK_BYTES: z.preprocess(blankIsUnset, z.coerce.number().int().min(0).default(2_097_152)), // 0 = no clip
MEDIA_RANGE_REQUIRED: z.preprocess(blankIsUnset, z.stringbool().default(true)),
MEDIA_HLS_KEY_DIR: z.preprocess(blankIsUnset, z.string().startsWith('/').default('/run/hls-keys')),
HLS_PACK_FIRST_MS: z.preprocess(blankIsUnset, z.coerce.number().int().min(0).default(1_200_000)),
```
- WEB_ORIGIN (env.ts:35) refine: every comma entry matches `^https://[a-z0-9.-]+$` or `^http://localhost:\d+$`; no `*`. The sslip.io hosts pass.
- Reused: LOGIN_CODE_PEPPER. Precondition: set on the server; e2e already has it.
- MEDIA_KEK: set by hand on the server (2.8), never in the env merge.
- e2e API env (e2e/playwright.config.ts:115-136): MEDIA_CHUNK_BYTES '16384' (C3); MEDIA_HLS 'true', a fixed test MEDIA_KEK, MEDIA_HLS_KEY_DIR = a mkdtemp dir, HLS_PACK_FIRST_MS '1000' (C8). That API runs with no APP_ROLE, so as 'all' with jobs in-process (app-role.ts:5,18, reviewer); seeded rows never pass finishByEgress, so without HLS_PACK_FIRST_MS the first pack would run 20 min after boot.

Config «القيم» (code-registered, no seed migration; enum type at packages/settings/src/defs.ts:76-78):
- recording_media {type:'enum', options:['audio','video'], default:'audio'} in packages/settings/src/domains/teaching/recordings.ts:8-22. Add it to VALUE_GROUPS (value-groups.ts:25-40) and as 'plain' in VALUE_CONFIRM (:74-86). ar/en label + a description that video runs a headless browser per room on this server and can stop lessons being recorded.
- media_devtools_guard {type:'boolean', default: true} in the same domain file (C9).
- recording_media is read in RecordingStarter.startFor (recording.starter.ts:46-59), which passes a `Record<Media, {ext, body}>` into recordingPath (egress-request.ts:9-12) and egressRequest (:29-50; audio_only at :33). Video loses the SDK source (:22-24), so egress runs headless Chrome.
- Fallback: when a video start is refused (start() catch, recording.starter.ts:62-80), set the claimed row's file_path to the .mp3 sibling and start the audio body once, same claim. The claim stores the path first (:52-53), so the path must change with the body.

Other scope calls:
- sniffMime on lesson-file register (security plan item 9): OUT. file-sniff.ts:7-16 cannot recognise mpeg, aac, webm or wav. Not needed: families never get originals from cookie routes, the sandbox probe fails closed (pages=0), and /media Content-Type comes only from the DB-mime allow-list.
- recordings_family_progressive: not now; it comes with phones on HLS (cleanup PR).

6. ORDERED COMMITS

| # | PR | Commit | Files | Tests (next to code) | Rollback |
|---|---|---|---|---|---|
| C1 | A | storage: ranged open | store/object-store.ts, NEW store/read/s3-open.ts, minio-source.ts → s3-open, s3-client.ts (media client), s3-store.ts remove batching, objects.supabase.ts, storage.service.ts (+open, doc trimmed), NEW storage.media-paths.ts | s3-open with s3.fakes.ts: 200/206/416; a store 200 to a ranged request → 416 and the body destroyed; abort destroys the body; Supabase ranged fetch; MinioSource unchanged; remove in batches of 50 | revert; nothing calls it yet |
| C2 | A | media credential | common/http/{media-cookie.ts, media-link.ts}; common/auth/{decorators.ts (MEDIA_AUTH), auth.guard.ts, auth.module.ts}; media/session/media-session.controller.ts; media/stream/{range.ts, media-reply.ts}; media/media.module.ts (imported by student-recordings.module.ts:25); WEB_ORIGIN refine; packages/shared …/media.ts; parity: access-before.json + SIGNED_IN_ONLY | cookie sign/verify, expiry, tampered role/sub/sig, a ≠ b; guard: cookie accepted only on @MediaAuth handlers, Bearer still first, disabled → 403, none → 401; POST answers 200 {expires_at} that mediaSessionSchema parses; Set-Cookie attributes exact; range: single, open, suffix > size, `bytes=500-100`, `bytes=-0`, multi → 416; chunk clip; header set; ACAO only for WEB_ORIGIN entries; WEB_ORIGIN refine | revert; the cookie is not used yet |
| C3 | A | progressive streams + audit | migration 100210; media/access/{media-gates.ts, media-audit.ts, media-caps.ts}; media/media.repo.ts; media/session/media-events.controller.ts; media/stream/{recording-media.controller.ts, meeting-media.controller.ts, portal-media.controller.ts, file-stream.service.ts, open-streams.ts}; media/report/{media-report.controller.ts, report-public-media.controller.ts} (audio /file); ReportPageService.attachment, ReportCodeService.attachment; PortalReportsRepo.playableRecording/sentFor; /file and /original routes; POST /media/events (C9 uses it); parity entries; types.ts; e2e fixture e2e/fixtures/lesson-20s-16k.mp3 (~40 KB) | 2nd chunk after visible_to_student=false → 404; another family → 404; a meeting row on /media/recordings → 404; meeting recording for a non-creator → 404; assistant on a lesson file → 404; report file for a non-reader → 404; public report file without ab_report → 404/401 as view(); no Range → 400; Content-Type only from the Record; one slot row per (viewer, asset, purpose, 10 min), `bytes=1-` also writes one; a public viewer dedups on `ip:`; 31st start → 429; 5th open stream → 429; a 301-char UA is stored as 300; an insert error → 503 and no body; open streams destroyed on shutdown; event for an unknown asset → 404, 11th event → 429; SQL e2e: RLS (an authenticated non-admin reads 0 media_access rows; the dropped policies are gone); e2e/tests/teaching/media-stream.api.spec.ts on the Supabase store, uploading the fixture to the recordings bucket (seeded as student-recordings-api.spec.ts:14-20,50-56) + e2e/areas.json (ci.yml:392 guard) | code revert. The migration is forward-only and additive; to restore the dropped policies, re-create them from 189:25-26,33-34 and 212:18 |
| C4 | A | web player + protection | @videojs/react dep; player/* (3.2-3.3); protect/{Watermark, ProtectedSurface, use-protect-keys, protect-keys}; client-core media-session.ts, media-urls.ts; sign-in.ts:115; web-push-session.ts listener; the 4 player users + ReportPageFiles audio; remove AudioPlayer/PlayerButtons/use-html-audio, the FileButtons recording path and the url hooks; i18n | no recording URL reaches window.open or an href (except the admin original); no element has crossorigin='anonymous'; every element has preload="none" and nodownload; video/hls have disablePictureInPicture; <Audio> gets no video-only prop; the watermark renders inside the container; iPhone fullscreen never calls webkitEnterFullscreen; SeekBar seeks the player in RTL; contextmenu, drag and keys prevented; recovery re-mints once, then seeks; the session query is keyed by user and SIGNED_OUT calls close(); sw.js has no fetch handler; e2e family-portal.spec.ts: the first media request carries Range and only the cookie, playback crosses 2 chunks (16 KiB chunks), no /file request before the press, the same URL in a fresh context → 401 | revert; the API keeps serving |
| C6 | A | file pages | migration 100220; sandbox ops and files (section 4); lesson-files/view/*; page routes for lesson files and report files; public report page `url` → the cookie route (`…/attachments/:id/file` for audio, `…/pages/1` for pdf/image); viewer/*; PortalFileList, LessonFileItem, ReportPageFiles; upload cap; backup.sh exclude + Drive skip; Dockerfile stamp smoke; types.ts | stamp-label from the lesson date in the student tz; image-tool args; a label with ':' or a quote refused; parseOp + per-op caps; HEIC → pages 0; probe once on first view; inSlot taken before the read; stamped cached per (file, student, page); 422/400/503 states; no cookie or Bearer route returns original bytes to a family; the viewer's img src is on the API, never a storage host; print:hidden; backup excludes /view/; e2e (CI has no sandbox): «العرض غير متاح الآن», no response is application/pdf | revert; the columns stay null |
| C7 | A | sha256 + upload guards | migration 100230; integrity/{media-integrity.job.ts, integrity.repo.ts, integrity.service.ts}; register hash + dedup + real size; ETag; uploader-bound key + exact check; 409 on a re-used path; audit rows; types.ts | hash helper streams, never buffers; CAS dedup (a second claim is a no-op); a missing object sets integrity_failed_at and is not claimed again; re-check only after 7 days and only minio paths; re-check byte cap; a mismatch sets integrity_failed_at; If-Range is ignored; another uploader's path is refused; a duplicate returns the existing row | revert; the nullable columns stay |
| C8 | A | encrypted HLS (MEDIA_HLS=false) | migration 100240; env.media.ts; pack/{hls-pack.job.ts, hls-pack.repo.ts, hls-pack.service.ts, ffmpeg-hls.ts, ffmpeg-playlist.ts}; hls/{playlist.ts, media-key.ts, hls-on.ts}; hls routes with the segment memo + in-memory counter; RecordingAdminRepo.setVisible ('skipped' → 'pending'); eraser; webhook kick; bucket-rules; compose worker tmpfs; Dockerfile HLS smoke; web hlsjs-video dep + hls-config + playback-mode; lists `hls`; docs/09, docs/45 §1a + disk watch, .env.example; .github/workflows/ci.yml; e2e/playwright.config.ts; NEW path-filtered CI job `docker build -f apps/api/Dockerfile .` on Dockerfile or ffmpeg-args changes | playlist golden string; ffmpeg playlist parse (repeated KEY lines pass; another IV or URI, or a segment gap, is rejected); ffmpeg args (aac vs copy, mp3 vs mov, hls_time 30 vs 6, the whitelist); wrap/unwrap (a wrong AAD fails; a wrong KEK sets 'failed'/'kek' and 404); claim: only visible lesson rows in the active store, none while a room records, stale recovery gives the attempt back, attempts → failed, gate off → idle; statfs skip; hlsOn false when MEDIA_HLS is off → lists hls:false and HLS routes 404; segment after hide → 404 within 60 s; family cookie on /media/recordings/:id/hls/s/0.ts → 404; 401st segment → 429; 21st key fetch → 429; eraser removes segments + key. e2e/tests/teaching/media-hls.spec.ts (a 20 s clip packed by the job): first assertion `MediaSource.isTypeSupported('audio/mp4; codecs="mp4a.40.2"')`, currentTime > 3, segments are video/mp2t with no-store, a fresh context gets 401, no key or segment request before the press. Projects media-firefox, media-webkit with testMatch /media-hls/; `testIgnore: /media-hls/` on desktop and mobile (playwright.config.ts:69-81); an https knob if Secure cookies drop on http://localhost. ci.yml: browser list in the cache key (:554), `playwright install --with-deps chromium firefox webkit` (:557), `sudo apt-get install -y --no-install-recommends ffmpeg` | MEDIA_HLS=false in the server .env + `roll.sh --env-only` (or the deploy's env_only): every list says hls:false and the web plays /file. Rows a wrong KEK marked 'failed'/'kek': the reset SQL in 2.8. A code revert keeps the additive columns. Enable steps: MEDIA_KEK set by hand + offline copy, MINIO_RECORDINGS on (owner choice 7), then MEDIA_HLS=true + env_only |
| C9 | A | devtools guard | disable-devtool dep; protect/use-devtools-guard.ts; media_devtools_guard setting | explicit detector list, disableMenu false; suspended on unmount; pause + blur + one event; the switch off → no init; never signs out | the switch, or revert |
| C10 | A | recording_media setting (needs the owner's go on the boards) | settings defs and groups, recording.starter.ts, egress-request.ts, i18n | setting → egress body and extension for audio and video; a refused video start → the row's path becomes .mp3 and the audio body starts once | the default 'audio' is today's behaviour |
| C5 | B | close storage links (compat) | the 3 /url services (portal-reports.service.ts:55-63, portal-assets.service.ts:60-67, lesson-files.service.ts:73-77), R10 (report-files.service.ts:82-88) and the signed-in report page (report-page.service.ts:56-66, attachments only) return /media/l links; GET /media/l/:token; NEW POST /recordings/:id/url; lists return `url: null` (recording-list.service.ts:36-40, lesson-assets.service.ts:40-48; the fields stay nullable for old clients); staff-mobile StaffRecording.tsx:35-37 → open-in-phone.ts and RecordingPlay.tsx:11-26 call POST /recordings/:id/url (OTA) | lists carry no url (student, lesson, lesson-files, meeting); the link works without a cookie for 1 h and gives 404 after a hide; wrong context → 404; link requests count in media-req and write via 'link'; 31st mint → 429; parity entries | revert; the lists sign again. Staff phones cannot play for a few minutes between the API roll and the OTA (the ota job, deploy-staging.yml:420-445) |
| C11 | B | files host refuses recording GETs | deploy/staging/lb/Caddyfile:41-61: `@recget { method GET HEAD; path_regexp ^/[a-z0-9-]*recordings/ }` → 404; PUT/POST stay open for egress (store-source.ts:60-68); tools/scripts/ci-checks/compose/compose-minio.test.mjs:125 | compose test updated; roll.sh:49 validates the Caddyfile | revert the Caddyfile |

Production smoke right after each roll, with the owner's go (deploy-staging deploys the live stack):
- one MP3 with a seek; one old MP4; one voice note; one PDF page; one report attachment on the public code page;
- a 1-minute test meeting: its row turns done and /file plays. Also after C11 and after the egress user's policy change: a refused egress upload loses that lesson's audio for good.

Ops steps (owner, outside the repo): sslip.io web 308 and the /media/l log exclusion (before C4), the CSP (3.7), MEDIA_KEK in the server .env + offline copy (before MEDIA_HLS=true), the egress user's policy (docs/45:79-81).

Phones PR (mobile track, after PR A):
- family and staff in-app players with `{uri, headers:{Authorization}}` on /media (expo-audio is in both apps);
- an in-app pages viewer (expo-image with headers);
- no Linking.openURL for recordings, lesson files or report attachments (staff-mobile ReportPageFiles.tsx:18, family-mobile use-open-file.ts:13);
- FLAG_SECURE + the iOS capture notice (D, P1-P4).

Cleanup PR (after the phones PR):
- delete the 3 /url routes, R10, POST /recordings/:id/url, /media/l, the lists' url fields and the report attachments' `url`, once client-usage (main.ts:27-28) shows no old builds;
- add `recordings_family_progressive` and turn it off once phones play HLS;
- the sources: owner choice 2.

7. WHAT STAYS IMPOSSIBLE ON THE WEB, AND THE RESIDUAL RISK
- A visible change for families: a lesson file or report attachment that is HEIC, broken or over 10 MiB shows «لا يمكن عرض هذا الملف هنا» on the web, and every page view fails while ayat-pdf is down. Today they open the original. (Phones keep the compat link until the phones PR.)
- Screen and audio re-recording cannot be stopped. The watermark (student code + date) only traces video and pages. Audio carries no visual mark, so any listener can re-record it. Say this in the PR.
- The page stamp is visible; anyone who sees it can fit and paint it out. It deters casual sharing and traces unedited copies.
- No DRM: paid DRM is out of scope. AES-128 HLS is not DRM, because every authorised browser receives the key.
  - A signed-in user with devtools can copy the cookie (≤ 2 h) into ffmpeg or yt-dlp and pull the playlist, key and segments, or the progressive file in 2 MiB chunks. Segments stay gated, so this stops within 60 s of a hide or an unlink.
  - Caps slow bulk harvesting across many assets, not one patient user. In-memory caps are per API copy (two copies). The audit (ip, ua, 10-min slots) traces it.
- Only family-visible lesson recordings are packed. Meeting and staff-only recordings play progressive (TLS only). Old recordings stay progressive until made visible again or backfilled (owner choice 3).
- Until the cleanup PR:
  - any signed-in user can call the compat /url routes, R10 or the report page with their own Bearer and get a 1 h bearer API link. It is re-checked per request as that profile, capped and audited, but anyone holding it can use it for that hour;
  - family PDF/image originals (lesson files and report attachments) are reachable that way;
  - the report PDF keeps its signed storage link (out of scope, lessons-followup.txt:42);
  - the source MP3/MP4 stays cleartext in MinIO. Recordings are in no backup (backup.sh:14-15, drive-backup.runner.ts:41-45, reviewer), so "encrypted at rest" needs owner choice 2.
- A copied media cookie lives ≤ 2 h. Signing out on another device, or a role change, applies to this browser's cookie within ≤ 2 h. Disabled accounts are refused on every request.
- Devtools detection, key blocking, the context-menu block and print hiding are deterrents only. Menu-opened devtools, other browsers, proxies and screenshots get past them.
- XSS → session theft (from localStorage) is closed only by the app-host CSP (3.7), which lives in the host Caddy outside the repo.
- DB caps fail open on a DB error (rate-limit.repo.ts:31-34); the miss is logged. The audit insert fails closed.
- These stay possible by design, as today, and the owner may narrow them later:
  - group-lesson files reach every attending family (20261117100200_lesson_files.sql:1-4);
  - the assigned teacher hears every lesson of that student;
  - expired students keep their recordings (portal_students_of has no package filter, 20261027000790_portal_scope.sql:26-35).

UNVERIFIED / NOT FOUND (each has a test, smoke or device check named above)
- Same-site hosts: SameSite=Strict and CORP same-site need web and API on one registrable domain. That holds in prod (app./api.ayatalbayan.com) and in CI (localhost:5180/3100, playwright.config.ts:117,146). The sslip.io web host does not (3.7 redirect). The new ayat-albayan-stg hosts are not in the repo: check them, or relax CORP there.
- Not in the repo: the host Caddy, its CSP and access log; the production WEB_ORIGIN, bucketPrefix, MINIO_RECORDINGS value and egress endpoint; MinIO CORS and Cache-Control; the production Postgres major version (local is 17).
- Not checked: whether the Supabase copies of recordings still exist; whether access logs keep query strings.
- Video.js 10.2.0 and disable-devtool 0.3.9: read by the compat reviewer on unpkg, not by me (scratchpad vjs/ holds some of those files). clearLog's default: not confirmed.
- Browsers:
  - whether playback continues across short 206 chunks;
  - whether the first request carries Range; Safari's probe requests;
  - whether iOS AVFoundation sends the SameSite=Strict cookie (native HLS and progressive);
  - whether a locked iPhone keeps fetching progressive chunks for 45 min;
  - whether Firefox and WebKit keep a Secure cookie on http://localhost;
  - whether Playwright's bundled Chromium plays AAC (the media-hls spec asserts it first).
- hls.js 1.6.19 playing AAC-in-TS with AES-128 on Firefox MSE and iOS MMS: the CI projects cover it, plus an iPhone on iOS 17.1+ and one on iOS 16 by hand.
- ffmpeg: EXIF orientation, `-max_pixels`, the drawtext chain and the Amiri path (the Dockerfile smoke covers flags, not memory). HEIC needs ffmpeg ≥ 7.1.
- Whether egress admission measures host-wide CPU or its own cgroup.
- Whether sales or report-pdf imports student-recordings (module cycle with media/).
- The web's settings read path for families (C9).
- pg-boss: not found.

Rejected findings (whole or in part)
- bypass 5, part: no full asset gate on POST /media/events. An existence check plus 10 / 10 min per account bounds row growth; a fake event only writes the caller's own actor id.
- bypass 6, part: no MediaAuthGuard. AuthGuard reads the cookie on @MediaAuth handlers, so permissions and the coverage test stay in one place.
- bypass 8: rejected. The stamp is visible, so it can be fitted and removed with or without jitter; jitter adds sandbox argv for no real gain.
- compat 4 + ops M6, part: no sliding renewal and no iat. A fixed 2 h Max-Age plus background refetch covers a locked-phone lesson and gives a hard bound for a copied cookie.
- compat 5: moot. No new injection of TOKEN_VERIFIER.
- compat 22, part: no MediaRepo.profileRole read per cookie request; the role is bound into the signing context.
- ops H2, part: 'video' stays (the owner asked for audio or video by setting). A refused video start falls back to audio; the host question is owner choice 1.
- ops M1, part: not "pack only when recordsToMinio()", which would never pack in CI. The job packs rows whose source is in the active store, and only when that store may hold recordings.
- ops M2, part: owner decision 1 is not left open; the stamp uses the lesson date (§0 #20), and the per-day option moves to owner choice 4.
- ops M3, part: no probe at register at all; the first view probes.

Owner choices (cost and infra only)
1. Video recordings: on this VPS (one headless Chrome per room, 2–4 GB each, 300–600 MB per hour against ~62 GB free shared with the CRM; a refused start falls back to audio), or only after egress gets its own host. Default 'audio'.
2. Recording sources after packing: keep them (today; no at-rest gain; a lost KEK only drops back to /file), or delete them (encrypted at rest; a lost KEK then loses every recording, since backup.sh:14 excludes recordings on purpose, REC-4), or back up recordings plus an offline KEK.
3. HLS backfill of old family-visible recordings: one SQL to set them 'pending', packed one at a time when no room records (AAC ~20-40 s CPU each), or leave them progressive.
4. Stamp per viewing day instead of per lesson date: one stamp per (file, student, page, day), more sandbox runs and storage.
5. Worker CPU priority: `cpu_shares: 256` on ayat-worker (a priority), or `cpus: "1"` (a cap), or neither.
6. Lesson-file PDF/image cap: 10 MiB (fits ayat-pdf's 128 MB), or 25 MiB as the board says with more ayat-pdf memory.
7. HLS in production needs MINIO_RECORDINGS on (recordings then live on the shared VPS disk, ~29 MB per hour of audio, plus the same again in hls/ while the sources stay). With it off, MEDIA_HLS=true packs nothing and everything stays progressive.
