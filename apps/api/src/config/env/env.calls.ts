import { iceUrls, type CallIceServer } from '@ab/shared';
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import type { Env } from './env';
import { blankIsUnset, optionalSecret } from './env.blank';

/** A public STUN server: enough for most networks (the media flows device ↔ Meta, docs/28 §2). */
export const DEFAULT_STUN = 'stun:stun.l.google.com:19302';
/** How long a minted TURN credential works (TURN REST); a new one comes with every /calls/config. */
export const TURN_TTL_S = 6 * 3600;

/**
 * WhatsApp voice calls (docs/28): the staff device is the WebRTC peer, so there is no media server of
 * ours, only ICE. STUN defaults to a public server; TURN is optional: its urls (plain) and its shared
 * secret (Vault), from which short-lived per-user credentials are minted (TURN REST, coturn
 * use-auth-secret), so no device ever holds a long-lived TURN password.
 */
export const CALLS_SHAPE = {
  CALLS_STUN_URLS: z.preprocess(blankIsUnset, iceUrls.optional()),
  CALLS_TURN_URLS: z.preprocess(blankIsUnset, iceUrls.optional()),
  CALLS_TURN_SECRET: optionalSecret,
};

const urls = (raw: string): string[] => raw.split(',').map((u) => u.trim()).filter(Boolean);

/** TURN REST: username «<expiry unix s>:<user>», credential base64(HMAC-SHA1(secret, username)). */
export function turnCredential(input: { secret: string; userId: string; now: Date }): { username: string; credential: string } {
  const username = `${Math.floor(input.now.getTime() / 1000) + TURN_TTL_S}:${input.userId}`;
  return { username, credential: createHmac('sha1', input.secret).update(username).digest('base64') };
}

/** The RTCPeerConnection iceServers: STUN always, TURN only when its urls are set (with minted credentials). */
export function iceServers(env: Env, who: { userId: string; now: Date }): CallIceServer[] {
  const stun: CallIceServer = { urls: urls(env.CALLS_STUN_URLS ?? DEFAULT_STUN) };
  if (!env.CALLS_TURN_URLS) return [stun];
  const auth = env.CALLS_TURN_SECRET ? turnCredential({ secret: env.CALLS_TURN_SECRET, ...who }) : {};
  return [stun, { urls: urls(env.CALLS_TURN_URLS), ...auth }];
}
