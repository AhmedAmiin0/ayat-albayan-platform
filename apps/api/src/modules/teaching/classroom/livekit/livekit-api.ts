import { Inject, Injectable } from '@nestjs/common';
import type { z } from 'zod';
import type { FetchLike } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';
import type { Http } from '@/common/infra/http/http.types';
import {
  CLASSROOM_CONFIG,
  classroomConfigOf,
  type ClassroomConfigSource,
} from '@/modules/teaching/classroom/classroom.config';
import { mintServerToken, type ServerGrant } from './livekit-token';
import {
  ignoredAnswer,
  LivekitError,
  NO_PERMISSION,
  TWIRP_ERRORS,
  twirpErrorSchema,
} from './livekit-twirp';

export { LivekitError } from './livekit-twirp';

/** Injection token of the LiveKit transport: a test double, or null for the global fetch. */
export const LIVEKIT_HTTP = Symbol('LIVEKIT_HTTP');

/** A Twirp call never had a deadline; a hung LiveKit now ends as LivekitError 504 (docs/36 h5). */
const TIMEOUT_MS = 15_000;

/** The signalling URL (wss://) as the HTTP base of the Twirp API (https://). */
export const twirpBase = (url: string): string =>
  url.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:').replace(/\/+$/, '');

interface TwirpCall {
  /** e.g. livekit.RoomService/RemoveParticipant */
  method: string;
  body: object;
  grant: ServerGrant;
}

/** The LiveKit profile of the one outbound client; the base follows the config read per call. */
const twirpHttp = (url: string, transport: FetchLike | null): Http =>
  createHttp({
    name: 'livekit',
    base: () => twirpBase(url),
    headers: () => Promise.resolve({}),
    timeoutMs: TIMEOUT_MS,
    // A signed server token never follows a redirect to another host (T1).
    redirect: 'error',
    errorBody: twirpErrorSchema,
    errors: TWIRP_ERRORS,
    ...(transport ? { fetch: transport } : {}),
  });

/** Already gone (Twirp not_found): a remove or a close that counts as done. */
const isGone = (e: unknown): boolean => e instanceof LivekitError && e.code === 'not_found';

/**
 * LiveKit's server API (Twirp over JSON, no SDK): one short-lived server token per call. Every
 * method throws when LiveKit is not configured or answers non-2xx.
 */
@Injectable()
export class LivekitApi {
  constructor(
    @Inject(CLASSROOM_CONFIG) private readonly source: ClassroomConfigSource,
    @Inject(LIVEKIT_HTTP) private readonly transport: FetchLike | null,
  ) {}

  /** LIVEKIT_* are set. */
  get configured(): boolean {
    return classroomConfigOf(this.source) !== null;
  }

  /** One Twirp method; its answer parsed by that method's schema (livekit-twirp.ts). */
  async call<S extends z.ZodType>(
    input: TwirpCall,
    schema: S,
    now = new Date(),
  ): Promise<z.output<S>> {
    const config = classroomConfigOf(this.source);
    if (!config) throw new LivekitError(503, 'not_configured');
    const authorization = `Bearer ${mintServerToken(config, input.grant, now)}`;
    const path = `twirp/${input.method}`;
    const http = twirpHttp(config.url, this.transport);
    const headers = { authorization };
    return http.json({ path, method: 'POST', json: input.body, headers, schema });
  }

  /** Disconnects one participant now. Already gone (not_found) counts as done. */
  async removeParticipant(input: { room: string; identity: string }): Promise<void> {
    const grant = { roomAdmin: true, room: input.room };
    const method = 'livekit.RoomService/RemoveParticipant';
    await this.call({ method, body: input, grant }, ignoredAnswer).catch((e: unknown) => {
      if (!isGone(e)) throw e;
    });
  }

  /** Permissions revoked, then disconnected; already gone counts as done. */
  async revokeAndRemove(input: { room: string; identity: string }): Promise<void> {
    const grant = { roomAdmin: true, room: input.room };
    const body = { ...input, permission: NO_PERMISSION };
    const method = 'livekit.RoomService/UpdateParticipant';
    await this.call({ method, body, grant }, ignoredAnswer).catch((e: unknown) => {
      if (!isGone(e)) throw e;
    });
    await this.removeParticipant(input);
  }

  /** UpdateParticipant replaces the whole permission, so subscribe and data stay on. */
  async setScreenShare(input: { room: string; identity: string; allow: boolean }): Promise<void> {
    const screen = input.allow ? ['SCREEN_SHARE', 'SCREEN_SHARE_AUDIO'] : [];
    const permission = {
      can_subscribe: true,
      can_publish: true,
      can_publish_data: true,
      can_publish_sources: ['CAMERA', 'MICROPHONE', ...screen],
    };
    const body = { room: input.room, identity: input.identity, permission };
    const method = 'livekit.RoomService/UpdateParticipant';
    await this.call({ method, body, grant: { roomAdmin: true, room: input.room } }, ignoredAnswer);
  }

  /** Already gone (not_found) counts as done and returns false; egress ends with the room. */
  async deleteRoom(room: string, now = new Date()): Promise<boolean> {
    const input = { method: 'livekit.RoomService/DeleteRoom', body: { room } };
    return this.call({ ...input, grant: { roomCreate: true } }, ignoredAnswer, now).then(
      () => true,
      (e: unknown) => {
        if (isGone(e)) return false;
        throw e;
      },
    );
  }

  /**
   * Creates the room ahead of its first participant (an egress needs an existing room). Returns
   * the existing room when it is already there. Ten empty minutes before LiveKit closes it.
   */
  async createRoom(room: string): Promise<void> {
    const body = { name: room, empty_timeout: 600 };
    const method = 'livekit.RoomService/CreateRoom';
    await this.call({ method, body, grant: { roomCreate: true } }, ignoredAnswer);
  }
}
