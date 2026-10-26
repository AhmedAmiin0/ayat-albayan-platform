import { iceUrls, type CallIceServer } from '@ab/shared';
import { z } from 'zod';
import type { Env } from './env';
import { blankIsUnset, optionalSecret } from './env.blank';

/** A public STUN server: enough for most networks (the media flows device ↔ Meta, docs/28 §2). */
export const DEFAULT_STUN = 'stun:stun.l.google.com:19302';

/**
 * WhatsApp voice calls (docs/28): the staff device is the WebRTC peer, so there is no media server of
 * ours, only ICE. STUN defaults to a public server; TURN is optional (urls + username plain, its
 * password a Vault secret via «التكاملات»).
 */
export const CALLS_SHAPE = {
  CALLS_STUN_URLS: z.preprocess(blankIsUnset, iceUrls.optional()),
  CALLS_TURN_URLS: z.preprocess(blankIsUnset, iceUrls.optional()),
  CALLS_TURN_USERNAME: optionalSecret,
  CALLS_TURN_CREDENTIAL: optionalSecret,
};

const urls = (raw: string): string[] => raw.split(',').map((u) => u.trim()).filter(Boolean);

/** The RTCPeerConnection iceServers: STUN always, TURN only when its urls are set. */
export function iceServers(env: Env): CallIceServer[] {
  const stun: CallIceServer = { urls: urls(env.CALLS_STUN_URLS ?? DEFAULT_STUN) };
  if (!env.CALLS_TURN_URLS) return [stun];
  const auth = {
    ...(env.CALLS_TURN_USERNAME ? { username: env.CALLS_TURN_USERNAME } : {}),
    ...(env.CALLS_TURN_CREDENTIAL ? { credential: env.CALLS_TURN_CREDENTIAL } : {}),
  };
  return [stun, { urls: urls(env.CALLS_TURN_URLS), ...auth }];
}
