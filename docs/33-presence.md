# 33 — Online status and last seen

Owner 2026-10-30, verbatim: «add last seen and online status». Asked where, he chose all three:

1. **In-app chats** (the student channel of docs/31 §2, opened after subscription + assignment): the
   teachers, students and families who use the app show «متصل الآن» or «آخر ظهور …» in the chat header,
   web and mobile.
2. **Staff list for admins**: which assistants, teachers and admins are online now and when each was last
   seen.
3. **WhatsApp-only contacts**: Meta never shares a WhatsApp user's presence, so the chat header shows
   «آخر رسالة منذ …»: the time since their last inbound message.

## 1. Two signals

| Signal | Source | Lives |
|---|---|---|
| Online now | Supabase Realtime **Presence**, through the realtime client the apps already hold (`supabase`, the same socket as the inbox and channel nudges; `@ab/client-core/presence`) | in the socket only, never stored |
| Last seen | `public.profile_presence.last_seen_at` (UTC `timestamptz`), written by the API | one row per platform user |

No new service, no native module (mobile ships by OTA only): Presence is part of `@supabase/supabase-js`,
already in both apps.

### 1.1 Online now (Presence)

- Each signed-in user, while the app is open (web: tab visible; mobile: foreground), joins **their own
  private topic** `presence:<profile id>` and `track()`s one tiny meta `{ at }`. Nothing else is tracked.
- A viewer **subscribes, never tracks**, to the topic of each person it shows: one in a chat header, the
  staff (≤ `PRESENCE_WATCH_MAX` = 80) on the staff list. Someone is online when their topic's presence state
  holds at least one meta (any device).
- Private topics: Realtime asks `realtime.messages` RLS at join (`extension = 'presence'`):
  - **insert** (track) only on one's own topic, and only while `presence_enabled` is on;
  - **select** (join, hear) when `public.presence_can_watch(target)` says so, the SQL twin of the API rule
    (§2). So a client that calls Realtime directly can not watch anyone the API would not show it.
- A stack without Realtime (CI's e2e stack) skips the policies with a notice
  (`presence_install()`, as `inbox_live_install()` of migration 860).
- While a watch is not joined (Realtime down, refused or absent), someone whose last seen is under
  `PRESENCE_RECENT_MS` (2 min) old reads as online (`isOnline`); once joined, only Presence decides.

### 1.2 Last seen (API)

- A global interceptor (`LastSeenInterceptor`) sees every **authenticated** request after the AuthGuard
  and hands the user id to `LastSeenService.seen()`, which does no I/O: the pure `shouldTouch()` lets a
  user through at most **once a minute** per API process (an in-memory map of the last time, bounded at
  10 000 users, oldest dropped first) into a queue. Never a write per request.
- Every 15 s an unref'd timer writes the queue in **one** RPC, `presence_touch(profiles[])`: an upsert
  whose update only fires when the stored value is over a minute old, so two API processes still write
  each user about once a minute. A failed write is a warning; a shutdown drops under 15 s of last seen.
- **Presence leave**: not written. The last API call is at most a minute older than the last moment
  the app was open, and a leave sent from a closing tab or a backgrounded phone is not reliable; the
  cheap answer is the throttled activity write alone.
- `presence_enabled` off: no write, no track, nothing shown (§3).

## 2. Who may see whom (privacy)

The rule is enforced in the API (`maySeePresence`, `@ab/shared/presence`, unit-tested for each role
pair) and again at the socket (`presence_can_watch`). It never shows the presence of someone the viewer
cannot already open a chat with:

| Viewer | Sees | Through |
|---|---|---|
| guardian / student (own contact) | their student's current teacher(s) (`channel_teacher_ids`), only while the channel is open | `GET /portal/students/:id/channel/presence` |
| teacher | the family app users (guardian login, self-contact student login) of their current students with an open channel | `GET /teachers/me/channels/:id/presence` |
| assistant (sales) | the family app users of their own students (sales ownership) | `GET /sales/students/:id/channel/presence` |
| admin | everyone in any channel, and the staff list | `GET /students/:id/channel/presence`, `GET /presence/staff` |
| anyone else (classroom assistant, a custom monitor, another family or teacher) | nobody | 404 `student_not_found` (the channel's own answer) or 403 |

Each channel route first runs the channel's own access check (`ChannelAccess`: the same 404 as the
messages route), then filters the channel's participants with `maySeePresence`. Monitors never appear in a
family's header: they read, they do not take part. The staff list is `users.read` **and** the base role
admin. Responses carry ids, a role and a time; never a phone or email.

## 3. Setting

`presence_enabled` («إظهار حالة الاتصال وآخر ظهور», «القيم» › الرسائل, bool, default **on**,
reaches families). Seeded by the config seeder like every registry key (no data in the migration). Off:
the API returns `{ enabled: false, peers: [] }`, stops last-seen writes, the apps neither track nor watch,
and the RLS insert policy refuses a track.

## 4. Display

Shared pure text (`presenceWhen`, `@ab/shared`), the viewer's clock (12/24 h from `useClockCycle`) and zone:

| Age | Text |
|---|---|
| < 1 min | «الآن» |
| < 60 min | «منذ 5 دقائق» (Arabic count forms) |
| same day | «اليوم 10:30» / «اليوم 10:30 ص» |
| the day before | «أمس» |
| older | «25 أكتوبر» (the year when it is not this year) |

- Online: «متصل الآن» with a small success-toned dot (existing tokens, no palette change).
- Offline: «آخر ظهور {when}»; no time known: nothing.
- WhatsApp chat header: «آخر رسالة {when}» from the thread's `last_inbound_at` (already in `ThreadView`,
  from `thread_summaries` / `v_threads`): no new query. Only in the header.
- Staff list (admin, «المستخدمون» › «حالة الفريق»): online first, then by last seen, newest first,
  with «متصلون الآن: n».

## 5. Migration `20261030000985_presence.sql`

Expand only, idempotent, no row written:

- `public.profile_presence (profile_id pk → profiles on delete cascade, last_seen_at timestamptz)`, RLS on,
  no policy: the API (service role) is its only reader and writer.
- `presence_touch(uuid[])` (service role), `presence_can_watch(uuid)` (authenticated, definer),
  `presence_enabled()` (definer, reads `settings`), `presence_topic_profile(text)`,
  `presence_install()` (the two `realtime.messages` policies, skipped without Realtime).

Manual rollback (after the code rollback): `drop policy if exists presence_watch on realtime.messages;
drop policy if exists presence_track on realtime.messages;` then drop the five functions and the table.

## 6. Tests

API: each role pair allowed / denied (`maySeePresence`), the four channel routes and the staff route
(allowed, 404, 403), the throttle, the setting off. Shared: relative text in Arabic and English, 12 and
24 h. client-core: track and watch against a fake realtime client. Web (vitest + RTL) and mobile
(jest-expo): header online / last seen / WhatsApp last message, staff list states. e2e: an admin's staff
list shows a signed-in staff member online (`e2e/tests/people/presence-staff.spec.ts`, area `people`).
