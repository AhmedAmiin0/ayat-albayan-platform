/**
 * A reinstall mints a new token; the dead one stays until Expo reports it DeviceNotRegistered,
 * on a push ticket (expoDeliver) or a receipt (PushReceiptsJob), which delete its session binding
 * (the release trigger takes it off the profile). Keep the newest few meanwhile.
 */
export const MAX_PUSH_TOKENS = 10;

/** Appends `token` once (dedupe), oldest dropped past the cap. Same array back when present. */
export function withPushToken(tokens: string[], token: string): string[] {
  if (tokens.includes(token)) return tokens;
  return [...tokens, token].slice(-MAX_PUSH_TOKENS);
}

export function withoutPushToken(tokens: string[], token: string): string[] {
  return tokens.includes(token) ? tokens.filter((t) => t !== token) : tokens;
}
