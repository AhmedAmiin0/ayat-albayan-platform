# Data safety form: «آيات البيان» (com.ayatalbayan.family)

Every answer below was checked against the code on 2026-11-21; the file that proves it is beside it.
Play's definitions: **collected** = sent off the device by the app; **shared** = sent to a third
party other than a service provider acting for us. Data that staff type in the staff app (age,
gender, programme, payments) is shown in this app but not collected by it.

## Overview questions

| Question | Answer | Proof |
|---|---|---|
| Does the app collect or share any of the required user data types? | **Yes** (collects) | sections below |
| Is all user data encrypted in transit? | **Yes** | API and portal over HTTPS; LiveKit only `wss` (`apps/api/src/config/env/env.livekit.ts`); recording upload endpoint must be https (`apps/api/src/config/env/env.recording.ts`); files through signed URLs |
| Do you provide a way for users to request that their data is deleted? | **Yes** | `https://family.ayatalbayan.com/delete-account` (`apps/family-web/src/routes/delete-account.tsx`), linked in the app (`apps/family-mobile/src/account/LegalLinks.tsx`) |
| Does the app share data with third parties? | **No** | Supabase, Meta WhatsApp, Expo/FCM, LiveKit (self-hosted) and the VPS host act as service providers for the academy: Play does not count that as sharing |
| Committed to the Families policy? | **Yes** | `target-audience.md` |
| Independent security review | No (leave unticked) | — |

Account deletion URL to enter: **https://family.ayatalbayan.com/delete-account**.
There is no in-app self-service deletion; the page explains the request by email (owner to-do in
`checklist.md`).

## Data types: collected

All: **not shared**, **not optional unless noted**, never used for advertising or marketing, no
analytics SDK (`apps/family-mobile/app-store.test.ts` bans ads/analytics/crash SDKs).

| Play category → type | Collected? | Required/optional | Purposes | Ephemeral? | Proof |
|---|---|---|---|---|---|
| Personal info → **Name** | Yes | Required | App functionality, Account management | No | Declared conservatively: staff register it, the account is tied to it and it is shown to the teacher in chat and the lesson room (`/portal/me`, `/me/profile`: `apps/api/src/modules/people/portal/portal.controller.ts`) |
| Personal info → **Phone number** | Yes | Required (guardian sign-in) | Account management, App functionality | No | `POST /auth/code/request` (`apps/api/src/modules/people/sign-in/sign-in.controller.ts`) |
| Personal info → **User IDs** | Yes | Required | Account management | No | Student code + password sign-in (`POST /auth/login`), Supabase user id |
| Personal info → Email address | **No** | — | — | — | Family logins use a synthetic never-delivered address (`apps/api/src/modules/people/sign-in/accounts/provision.ts`) |
| Personal info → Other info (age, gender) | **No** (entered by staff, only displayed) | — | — | — | No family write endpoint (`apps/family-mobile/src/profile/ProfileScreen.tsx`: read-only) |
| Messages → **Other in-app messages** | Yes | Optional | App functionality | No | Teacher chat `channel_messages` (`packages/shared/src/messaging/channel/`), absence reasons and lesson requests (`portal-actions.controller.ts`). Chat is off by default (`packages/settings/src/domains/family-app.ts`) but declared because the build can turn it on |
| Photos and videos → **Photos** | Yes | Optional | App functionality | No | Chat photos, EXIF stripped (`packages/mobile-kit/src/channel/media/channel-pickers.ts`) |
| Photos and videos → **Videos** | Yes | Optional | App functionality | **Yes** (live in the lesson room, never stored: recordings are audio only) | `apps/api/src/modules/teaching/classroom/livekit/egress-request.ts` |
| Audio → **Voice or sound recordings** | Yes | Optional | App functionality | No | Voice notes in chat; audio recordings of lessons held in the online classroom (`egress-request.ts`, `apps/api/src/modules/teaching/student-recordings/`) |
| Files and docs → **Files and docs** | Yes | Optional | App functionality | No | PDF in chat, 15 MiB cap (`packages/shared/src/messaging/channel/channel-media.ts`) |
| App activity → **App interactions** | Yes | Required | App functionality, Fraud prevention / security | No | `activity_log`: route, status of each change (`apps/api/src/common/telemetry/activity/activity.entry.ts`, 180-day prune `packages/settings/src/domains/activity.ts`); «last seen» presence (`packages/settings/src/domains/presence.ts`) |
| App activity → **Other user-generated content** | Yes | Optional | App functionality | No | Lesson confirmations, cancellation reasons, requests for another time |
| Device or other IDs → **Device or other IDs** | Yes | Optional (notifications) | App functionality | No | Expo push token + hashed device key (`packages/mobile-kit/src/push/registerPush.ts`, `device-key.ts`); IP address and user agent in `activity_log` |

## Data types: not collected

Location (approximate or precise), Financial info (the app shows payment dates and amounts that staff
recorded; it sends none), Health and fitness, Contacts, Calendar, Web browsing, Installed apps,
Crash logs and Diagnostics (no crash SDK; the `X-AB-Client` build header is only counted in memory,
`apps/api/src/common/telemetry/client-usage/`), Search history, Emails, SMS.

Biometric unlock (`expo-local-authentication`) stays on the device: only two on/off flags are kept
in SecureStore (`packages/mobile-kit/src/biometric/core/flags.ts`); no biometric data leaves the phone.

## Re-check before each release

Re-run this list when any of these change: `apps/family-mobile/package.json` dependencies, a new
upload kind in `packages/shared/src/messaging/channel/channel-media.ts`, push payloads
(`apps/api/src/common/push/`), `activity_log`, or a new family write endpoint.
