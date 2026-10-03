# LiveKit reference (self-hosted on the VPS, see docs/09 and the owner's memory notes)

Working proof of concept that runs today on the VPS:
- `join.html` — the room page (vanilla JS + vendored `livekit-client` UMD): connect with a token, camera/mic/screen share, mute buttons, duplicate-identity handling, «شغّل الصوت» autoplay fallback.
- `token-server.mjs` — mints join tokens with `node:crypto` (HS256 JWT, claims: `iss`=API key, `sub`=identity, `name`, `nbf`, `exp`, `video:{roomJoin,room,canPublish,canSubscribe,canPublishData}`), no SDK needed.

Server: `wss://livekit-staging.148-230-116-195.sslip.io` (signalling through Caddy; media UDP 7882 / TCP 7881 / TURN UDP 3478). Env names: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (values only on the server and in the owner's secret stores — never in git).
Lesson learned: one token = one identity; opening the same personal link in two windows kicks the first (DUPLICATE_IDENTITY). Lesson links must mint a fresh identity per person/window.
