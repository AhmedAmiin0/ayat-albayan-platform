import type { Env } from './env';

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
