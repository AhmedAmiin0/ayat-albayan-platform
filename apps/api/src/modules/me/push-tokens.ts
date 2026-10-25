import { z } from 'zod';

/** What expo-notifications getExpoPushTokenAsync returns: «ExponentPushToken[xxxxxxxx]». */
export const pushTokenSchema = z
  .string()
  .regex(/^Expo(nent)?PushToken\[[\w-]+\]$/, { message: 'invalid_push_token' });

/** The key PUT /me/push-tokens handed this device last time (claimDevice): base64url, 32 bytes. */
export const deviceKeySchema = z.string().regex(/^[\w-]{43}$/, { message: 'invalid_device_key' });

export const pushTokenBody = z.object({ token: pushTokenSchema, deviceKey: deviceKeySchema.optional() });

/**
 * A reinstall mints a new token; the dead one stays until Expo reports it DeviceNotRegistered,
 * on a push ticket (common/push PushService) or a receipt (modules/push PushReceiptsJob), which
 * prune it with withoutPushToken. Keep the newest few meanwhile.
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
