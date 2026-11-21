# Target audience and content (Families policy)

## Answers

| Play Console question | Answer |
|---|---|
| Target age groups | **All groups: 5 and under, 6-8, 9-12, 13-15, 16-17, 18 and over** (guardians and students of every age; a child can sign in with their own student login) |
| Could the app unintentionally appeal to children? | Not applicable: children are a declared audience |
| Does the app contain ads? | **No** |
| Store listing: «Designed for families» / Teacher Approved | Optional; not needed to publish |

Because under-13s are in the audience, Google's **Families policy** applies in full.

## Families checklist

| Requirement | Status | Proof |
|---|---|---|
| No ads, no ad SDK | Met | `apps/family-mobile/package.json`; `app-store.test.ts` bans ad/analytics SDK names |
| No Advertising ID (AD_ID) | Met | `app.json` `blockedPermissions` has `com.google.android.gms.permission.AD_ID` (test: `app-store.test.ts`) |
| No identifiers beyond what the service needs (no IMEI, MAC, serial, Android ID for tracking) | Met | Only the Expo push token and a random device key hashed on the server (`packages/mobile-kit/src/push/device-key.ts`) |
| No location | Met | No location permission or library (`android-permissions` list in the PR body) |
| No broad photo access | Met | `READ_MEDIA_IMAGES` blocked; the picker uses the Android photo picker |
| Privacy policy covers children, linked in the store and the app | Met | `https://family.ayatalbayan.com/privacy` (section «الأطفال» / «Children»), «حسابي» rows |
| Account deletion URL | Met | `https://family.ayatalbayan.com/delete-account` |
| Children's sign-in is set up by a guardian, not self-registration | Met | Logins exist only for students the academy registered (`apps/api/src/modules/people/sign-in/accounts/provision.ts`); no sign-up screen in the app |
| Interaction with others limited and moderated | Met | Chat and room only with the student's own teacher and staff; chat off by default (`packages/settings/src/domains/family-app.ts`); staff can read and moderate |
| Content suitable for children | Met | Quran education only |
| Families Self-Certified Ads SDKs | Not applicable | No ads |

## Every SDK in the build and whether it is Families-compliant

| SDK | Role | Collects for itself? | Families |
|---|---|---|---|
| Expo SDK 57 (expo, expo-router, expo-updates, expo-constants, expo-localization, expo-font, expo-splash-screen, expo-status-bar, expo-device, expo-haptics, expo-secure-store, expo-file-system) | App runtime, OTA updates from `u.expo.dev` | No tracking; update checks only | OK |
| expo-notifications + **Firebase Cloud Messaging** (`firebase-messaging`) | Push delivery | FCM registration token only; no Analytics in the build | OK (FCM is allowed; Firebase Analytics is not included) |
| expo-image-picker, expo-document-picker | Photo/PDF for chat | No | OK |
| expo-audio, expo-video | Voice notes, playback | No | OK |
| expo-local-authentication | Biometric unlock | No (on device) | OK |
| expo-screen-capture | Blocks screenshots of lessons (FLAG_SECURE) | No | OK |
| LiveKit (`livekit-client`, `@livekit/react-native`, `@livekit/react-native-webrtc`) | Live lessons, self-hosted server | No (talks only to the academy's server) | OK |
| `@supabase/supabase-js` | Sign-in session, realtime | No third-party collection (academy's own project) | OK |
| TanStack Query, AsyncStorage, react-native-svg, safe-area, screens, `@expo/ui` | UI and cache | No | OK |

Not in the build (checked in `pnpm-lock.yaml`): Firebase Analytics, Crashlytics, Sentry, AdMob or any
ad network, Amplitude, Segment, Mixpanel, PostHog, Bugsnag, Facebook SDK.
