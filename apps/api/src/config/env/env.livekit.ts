import { z } from 'zod';
import type { Env } from './env';
import { blankIsUnset, optionalSecret } from './env.blank';

/**
 * Self-hosted LiveKit (tools/livekit/README.md): all three or none; unset = join routes answer 503
 * classroom_not_configured. The API mints plain HS256 join tokens (no SDK); values never committed.
 */
export const LIVEKIT_SHAPE = {
  LIVEKIT_URL: z.preprocess(blankIsUnset, z.url().optional()),
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
