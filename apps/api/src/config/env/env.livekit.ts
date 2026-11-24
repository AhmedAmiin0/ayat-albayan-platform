import { livekitUrl } from '@ab/catalog';
import { z } from 'zod';
import type { Env } from './env';
import { blankIsUnset, optionalSecret } from './env.blank';

/**
 * Self-hosted LiveKit (tools/livekit/README.md): all three or none; unset = join routes answer 503
 * classroom_not_configured. The API mints plain HS256 join tokens (no SDK); values never committed.
 */
export const LIVEKIT_SHAPE = {
  /** wss only (ws on localhost for dev and CI): the join tokens and the media never go in clear. */
  LIVEKIT_URL: z.preprocess(blankIsUnset, livekitUrl.optional()),
  LIVEKIT_API_KEY: optionalSecret,
  LIVEKIT_API_SECRET: optionalSecret,
};

/** What the classroom needs to mint a join token; null = not configured (503). */
export interface LivekitEnv {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export function livekitEnv(env: Env): LivekitEnv | null {
  const { LIVEKIT_URL: url, LIVEKIT_API_KEY: apiKey, LIVEKIT_API_SECRET: apiSecret } = env;
  return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}

const hostOf = (raw: string | undefined): string | null => {
  const url = livekitUrl.safeParse(raw?.trim()).data;
  return url ? new URL(url).host.toLowerCase() : null;
};

/**
 * T1: a DB LIVEKIT_URL («التكاملات») must name the host the server's env names; once env pins it,
 * a DB value elsewhere is dropped from the overlay (it would get every join and server token).
 */
export function livekitHostPinned(dbValue: string, envValue = process.env.LIVEKIT_URL): boolean {
  const pinned = hostOf(envValue);
  return pinned === null || hostOf(dbValue) === pinned;
}

/** The DB values pinned to their env value; every other key passes (its schema still applies). */
const PINS: Partial<Record<string, (value: string) => boolean>> = {
  LIVEKIT_URL: (value) => livekitHostPinned(value),
};

export const overlayPinned = (key: string, value: string): boolean =>
  PINS[key]?.(value) ?? true;
