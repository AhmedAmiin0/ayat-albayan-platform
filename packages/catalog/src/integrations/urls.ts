import { z } from 'zod';

// Bases that carry a secret (a server token, an API key in a header or the URL itself) or the
// classroom's media (audit T1): never in clear over the network. Plain http/ws stays allowed on
// this machine only (local dev, CI's wa-stub and `livekit-server --dev`), like minioPublicUrl.

const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1']);

interface Schemes {
  secure: string;
  local: string;
}

/** Scheme and host of a URL z.url() took (a regex: Hermes, on mobile, lacks URL.parse). */
const PARTS = /^([a-z][a-z0-9+.-]*:)\/\/(?:[^@/?#]*@)?([^/:?#]+)/i;

const schemeAllowed = (raw: string, s: Schemes): boolean => {
  const [, scheme = '', host = ''] = PARTS.exec(raw) ?? [];
  const protocol = scheme.toLowerCase();
  return protocol === s.secure || (protocol === s.local && LOCAL_HOSTS.has(host.toLowerCase()));
};

/** An API base: https, or http on localhost / 127.0.0.1. */
export const httpsUrl = z
  .url()
  .refine((raw) => schemeAllowed(raw, { secure: 'https:', local: 'http:' }), 'https_required');

/** The LiveKit server: wss, or ws on localhost / 127.0.0.1 (dev and CI). */
export const livekitUrl = z
  .url()
  .refine((raw) => schemeAllowed(raw, { secure: 'wss:', local: 'ws:' }), 'livekit_wss');
