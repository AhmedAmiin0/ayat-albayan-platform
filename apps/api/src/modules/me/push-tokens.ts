import { z } from 'zod';

/** What expo-notifications getExpoPushTokenAsync returns: «ExponentPushToken[xxxxxxxx]». */
export const pushTokenSchema = z
  .string()
  .regex(/^Expo(nent)?PushToken\[[\w-]+\]$/, { message: 'invalid_push_token' });

export const pushTokenBody = z.object({ token: pushTokenSchema });

/**
 * A reinstall mints a new token and nothing deletes the dead one until sending prunes it
 * (TODO(R-MOB-01): drop tokens Expo answers DeviceNotRegistered for). Keep the newest few.
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
