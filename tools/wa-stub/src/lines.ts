// The stub's Meta numbers (docs/12 §13.12): the notifications line always, the chat line only
// when its phone-number id is configured. Single-line options give exactly the old identity.
import type { IncomingMessage } from 'node:http';
import type { LineHealth, StubOptions } from './state.ts';

export interface StubLine {
  phoneNumberId: string;
  wabaId: string;
  appId: string;
  /** Webhook signing secret of this line's Meta app. */
  appSecret: string;
  /** metadata.display_phone_number of this line's webhooks. */
  displayPhone: string;
  /** entry[0].id of this line's webhooks (the WABA id Meta sends). */
  entryId: string;
}

/** stub.webhook.test.ts deep-equals these two for the notifications line: never change them. */
export const NOTIFICATIONS_DISPLAY = '15550001111';
const NOTIFICATIONS_ENTRY = 'stub-waba';
const CHAT_DISPLAY = '15550002222';

/** Notifications first, always; the chat line second when configured. */
export function stubLines(opts: StubOptions): [StubLine, ...StubLine[]] {
  const notifications: StubLine = {
    phoneNumberId: opts.phoneNumberId ?? 'stub-phone',
    wabaId: opts.wabaId ?? NOTIFICATIONS_ENTRY,
    appId: opts.appId ?? 'stub-app',
    appSecret: opts.appSecret ?? '',
    displayPhone: NOTIFICATIONS_DISPLAY,
    entryId: NOTIFICATIONS_ENTRY,
  };
  const c = opts.chat;
  if (!c) return [notifications];
  const wabaId = c.wabaId ?? 'stub-chat-waba';
  return [
    notifications,
    {
      phoneNumberId: c.phoneNumberId,
      wabaId,
      appId: c.appId ?? 'stub-chat-app',
      // One shared Meta app is a valid setup: the chat line then signs with the same secret.
      appSecret: c.appSecret ?? notifications.appSecret,
      displayPhone: CHAT_DISPLAY,
      entryId: wabaId,
    },
  ];
}

/** The line a phone-number id belongs to, or undefined. */
export function lineOf(opts: StubOptions, phoneNumberId: string | undefined): StubLine | undefined {
  return stubLines(opts).find((l) => l.phoneNumberId === phoneNumberId);
}

/** Every configured bearer; empty = lenient (any bearer passes). */
export function acceptedTokens(opts: StubOptions): Set<string> {
  const tokens = [opts.accessToken, opts.chat?.accessToken];
  return new Set(tokens.filter((t): t is string => typeof t === 'string' && t !== ''));
}

/**
 * Graph takes the token as Bearer or OAuth (the scheme the resumable upload documents). With a chat
 * identity the bearer of ANY configured line passes: the path's phone id is not tied to a token.
 * No WA_ACCESS_TOKEN = lenient, even with a chat token (single-line local dev, review C, S1).
 */
export function authorized(req: IncomingMessage, opts: StubOptions): boolean {
  const token = /^(?:Bearer|OAuth) (\S+)$/.exec(req.headers.authorization ?? '')?.[1];
  if (token === undefined) return false;
  if (!opts.accessToken) return true;
  const accepted = acceptedTokens(opts);
  return accepted.size === 0 || accepted.has(token);
}

/** A healthy, subscribed number: the stub's answer until POST /__stub/lines/{pn} changes it. */
export function initialHealth(opts: StubOptions): Map<string, LineHealth> {
  const health = new Map<string, LineHealth>();
  stubLines(opts).forEach((line, i) => {
    health.set(line.phoneNumberId, {
      subscribed: true,
      display_phone_number: `+${line.displayPhone}`,
      verified_name: i === 0 ? 'Ayat Al-Bayan Notifications' : 'Ayat Al-Bayan',
      quality_rating: 'GREEN',
      status: 'CONNECTED',
      name_status: 'APPROVED',
      code_verification_status: 'VERIFIED',
    });
  });
  return health;
}
