import { createHmac, randomBytes } from 'node:crypto';
import { participantMeta, type JoinRole } from '@ab/shared';
import type { LivekitEnv } from '../../../config/env/env';

// LiveKit join tokens are plain HS256 JWTs (tools/livekit/token-server.mjs is the reference), so
// no server SDK: claims iss = API key, sub = identity, name, nbf, exp, video grant.

/** Default lifetime: a lesson plus slack. */
export const TOKEN_TTL_S = 4 * 3600;
const MIN_TTL_S = 300;
const SKEW_S = 10;

type Source = 'camera' | 'microphone' | 'screen_share' | 'screen_share_audio';

export interface VideoGrant {
  roomJoin: true;
  room: string;
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
  canPublishSources?: Source[];
}

/**
 * Staff (teacher, admin, assistant) may publish everything. A guest holding a link may publish
 * camera and microphone but not share a screen into the room.
 */
export function grantsFor(role: JoinRole, room: string): VideoGrant {
  const base: VideoGrant = { roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: true };
  return role === 'guest' ? { ...base, canPublishSources: ['camera', 'microphone'] } : base;
}

/** One token = one identity (the same identity in two windows kicks the first), so every call gets a fresh one. */
export const newIdentity = (role: JoinRole, bytes: (n: number) => Buffer = randomBytes): string =>
  `${role}-${bytes(6).toString('hex')}`;

export interface TokenInput {
  room: string;
  role: JoinRole;
  /** Shown to the others in the room. */
  name: string;
  identity: string;
  /** Lifetime in seconds; capped to TOKEN_TTL_S, at least five minutes. */
  ttlSeconds?: number;
}

const b64 = (o: object): string => Buffer.from(JSON.stringify(o)).toString('base64url');

/** HS256 over `claims`, signed with the API secret (join, server and webhook tokens alike). */
export function signJwt(secret: string, claims: object): string {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(claims);
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

/**
 * A join token. `metadata` (participant.metadata in the room) carries the role, so every client
 * knows who may remove whom (participantMeta, @ab/shared).
 */
export function mintToken(cfg: Pick<LivekitEnv, 'apiKey' | 'apiSecret'>, input: TokenInput, now: Date): string {
  const ttl = Math.min(Math.max(input.ttlSeconds ?? TOKEN_TTL_S, MIN_TTL_S), TOKEN_TTL_S);
  const nowS = Math.floor(now.getTime() / 1000);
  return signJwt(cfg.apiSecret, {
    iss: cfg.apiKey,
    sub: input.identity,
    name: input.name,
    metadata: participantMeta(input.role),
    nbf: nowS - SKEW_S,
    exp: nowS + ttl,
    video: grantsFor(input.role, input.room),
  });
}

/** The video grant of a server-to-server call (RoomService, Egress), never given to a client. */
export interface ServerGrant {
  room?: string;
  roomAdmin?: boolean;
  roomCreate?: boolean;
  roomRecord?: boolean;
}

const SERVER_TTL_S = 600;

/** A short-lived token for one Twirp call of the API to LiveKit (the Authorization: Bearer). */
export function mintServerToken(cfg: Pick<LivekitEnv, 'apiKey' | 'apiSecret'>, grant: ServerGrant, now: Date): string {
  const nowS = Math.floor(now.getTime() / 1000);
  return signJwt(cfg.apiSecret, { iss: cfg.apiKey, sub: 'ab-api', nbf: nowS - SKEW_S, exp: nowS + SERVER_TTL_S, video: grant });
}
