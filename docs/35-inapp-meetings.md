# 35 — Meetings inside the mobile app

Owner 2026-10-30: «i want the meeting to be happening inside the app if the user was using the mobile app».
Branch `cloud/review-inapp-meetings`. **A native change: a new APK is required** (§4).

## 1. Scope

| Opens in the app (new) | Stays external |
|---|---|
| «ادخل الاجتماع»: internal / sales meetings (`POST /meetings/:id/join`) | a teacher's own fixed link (Zoom / Meet: `TeacherMeetingLink`, `TeacherLessonActions`) |
| «ادخل الحلقة»: the lesson classroom (`POST /lessons/:id/room/join`) | the guest / family web pages (`/public/...`), the web app itself (unchanged) |

The app calls the **same join endpoints** the web room uses. They already answer `{url, token, room, role}`
(`RoomJoinResult`). Until now the app read only the refusal and then opened the web page. No new route, no
server change, no new secret. The LiveKit token is held in memory only. It is never in a route parameter,
a log or the query cache.

## 2. Decision: B (the official LiveKit React Native SDK)

**A** (livekit-client on the installed `react-native-webrtc` 124.0.8, JS polyfills only) was rejected:

- LiveKit's React Native support is `@livekit/react-native`. Its `registerGlobals()` imports
  `AudioDeviceModule`, `audioDeviceModuleEvents` and `RTCAudioSession` from `@livekit/react-native-webrtc`.
  Those exist only in LiveKit's fork. It also needs its own native module (`LivekitReactNativeModule`:
  `AudioSession`, audio outputs, native events). So the SDK cannot run on upstream react-native-webrtc.
- The fork's README: «a fork … with a different underlying WebRTC fork» (webrtc-sdk M144, simulcast and
  E2EE patches), «primarily to be used in conjunction with the LiveKit React Native SDK». The installed upstream
  module is libwebrtc M124 (Jitsi's build).
- Using livekit-client without the SDK means rewriting its globals by hand: `LiveKitReactNativeGlobal`,
  URL, streams, `crypto.randomUUID`, `Array.prototype.at`, `Promise.allSettled`, `DOMException`. Even then there is
  no audio routing (speaker / earpiece / Bluetooth) and no iOS audio-session handling. Simulcast and
  adaptive-stream on an M124 build that LiveKit does not test is a further risk. jest-expo cannot prove any of
  it: there is no WebRTC in Node, so a passing test would only prove the mocks.

Risk list for A (why it is too fragile): audio routing (none: only expo-audio's coarse earpiece flag), the
iOS audio session (not configured), the Android audio focus and type (default media, not communication),
simulcast encodings and codec preferences on M124, untested data channels (chat / board topics), a
silent breakage on every livekit-client upgrade, and no supported path from LiveKit.

**B**, pinned exactly (each at least two weeks old on 2026-10-30):

| Package | Version | Released | Why |
|---|---|---|---|
| `@livekit/react-native` | 3.0.0 | 2026-09-11 | the SDK: `registerGlobals`, `AudioSession`, `VideoTrack` |
| `@livekit/react-native-webrtc` | 144.2.0 | 2026-09-11 | the fork the SDK requires (`^144.2.0`). It **replaces** `react-native-webrtc` 124.0.8 |
| `@livekit/react-native-expo-plugin` | 1.0.3 | 2026-09-23 | calls `LiveKitReactNative.setup()` at app start (Android), with the communication audio type |
| `livekit-client` | 2.22.3 | 2026-09-07 | the same version the web resolves (already in the lockfile) |

`@config-plugins/react-native-webrtc` 15.0.2 stays. It only writes permissions and the iOS texts, and it
names no package, so it serves the fork as well.

## 3. How it works

- **Flag** `meetings_in_app` (classroom settings, public, **default true**). Off = the browser, as before.
  It is read from `/settings/public`, and it needs no migration: the config seeder seeds it like every key.
- **Choice** (`classroom/room/state/room-mode.ts`): app when the flag is on **and** the native module is
  present (`NativeModules.LivekitReactNativeModule`, loaded lazily like the calls code). Otherwise the
  browser link opens. An older APK never crashes at boot: nothing imports the SDK at module scope.
- **Press**: the join API is called first, as today, so a refusal still reads in the sheet. On success
  the token is handed to the room screen in memory (`join-handoff.ts`), and the root stack opens
  `/room/<lesson|meeting>/<id>` full screen, for every signed-in tree.
- **Room screen** (`classroom/room/screen`):
  - permission step with the MSA reason, then the camera and microphone request. Android uses
    `PermissionsAndroid`. iOS asks inside `getUserMedia`. A refusal joins without that device and says so;
    «لا تسأل مجددًا» offers «افتح الإعدادات».
  - a preview of one's own camera, with mic and camera toggles, before «انضم».
  - in the room: كتم / الكاميرا / تبديل الكاميرا / مكبر الصوت ↔ السماعة / مغادرة (red).
  - a participant grid with names (one column for one or two, two columns above that). A shared screen is
    shown first and full width (viewing only).
  - «جارٍ إعادة الاتصال…» while LiveKit reconnects. Separate screens for ended, removed and «opened
    elsewhere» (duplicate identity). A failed connect offers «حاول مرة أخرى».
  - **«فتح في المتصفح»** on every state of the screen: it leaves the room and opens the web page.
  - RTL, the theme tokens, the dark «cover» surface of the calls screens.
- **WhatsApp calls** (docs/28) now load `@livekit/react-native-webrtc` (the same API:
  `RTCPeerConnection`, `mediaDevices`). Their behaviour is unchanged. Check them on the new APK.

## 4. Native impact

- Dependencies: the three native packages above, and `react-native-webrtc` removed. `app.json` adds the
  LiveKit expo plugin (`android.audioType: communication`). The microphone and camera texts now name the
  meetings too (`mobileRoom.native.*`).
- `expo.version` **0.3.0 → 0.4.0**. `runtimeVersion` follows the app version, so an OTA built from this code
  never reaches the 0.3.0 APK, which lacks the module. `native-changes.mjs` reports this PR as a native change.
- `SYSTEM_ALERT_WINDOW` stays blocked. Screen **sharing** from the phone is not offered
  (`enableScreenShareService` stays off: no MediaProjection service runs).

## 5. Background

- **Android**: the app has no foreground service. The remote audio keeps playing while Android keeps the
  process alive. From Android 9 the microphone is silenced in the background, and the camera always is.
  Back in the foreground everything resumes in the same room. A foreground service
  (`FOREGROUND_SERVICE_MICROPHONE`, e.g. through notifee) is a follow-up native change.
- **iOS**: no `UIBackgroundModes: audio`, so iOS suspends the audio in the background. Same follow-up.

## 6. Tests

jest-expo with a fake LiveKit client (no native module in Node): the screen's states (permission, preview,
connecting, connected with a grid, reconnecting, ended / removed / duplicate / failed), the controls, the
browser fallback, the flag and the press. Pure helpers (room mode, grid layout, permission answers, room
phase, snapshot) are unit-tested. The web is unchanged.

## 7. OWNER STEPS

1. Build and install the **new APK (0.4.0)**. CI never builds it (owner: never trigger EAS from a routine).
2. On a real device, check a meeting and a lesson: preview, mute, camera, switch camera, speaker / earpiece,
   a second participant, and turning wifi off and on (reconnect).
3. Check a WhatsApp call on the new APK (the WebRTC module changed underneath it).
4. To go back to the browser without a new APK: turn **`meetings_in_app`** off in «القيم» → الحلقات عبر الإنترنت.
