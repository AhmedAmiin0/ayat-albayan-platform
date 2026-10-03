import { Inject, Injectable } from '@nestjs/common';
import { CLASSROOM_CONFIG, type ClassroomConfig } from './classroom.config';
import { mintServerToken, type ServerGrant } from './livekit-token';

/** The slice of `fetch` the LiveKit calls use (stubbed in tests). */
export type HttpPost = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/** Injection token of the HttpPost (globalThis.fetch in the app). */
export const LIVEKIT_HTTP = Symbol('LIVEKIT_HTTP');

/** A non-2xx Twirp answer; `code` is Twirp's error code (e.g. not_found). */
export class LivekitError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`livekit ${status} ${code}`);
  }
}

/** The signalling URL (wss://) as the HTTP base of the Twirp API (https://). */
export const twirpBase = (url: string): string =>
  url.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:').replace(/\/+$/, '');

export interface TwirpCall {
  /** e.g. livekit.RoomService/RemoveParticipant */
  method: string;
  body: object;
  grant: ServerGrant;
}

/**
 * LiveKit's server API (Twirp over JSON, no SDK): one short-lived server token per call. Every
 * method throws when LiveKit is not configured or answers non-2xx.
 */
@Injectable()
export class LivekitApi {
  constructor(
    @Inject(CLASSROOM_CONFIG) private readonly config: ClassroomConfig,
    @Inject(LIVEKIT_HTTP) private readonly http: HttpPost,
  ) {}

  /** LIVEKIT_* are set. */
  get configured(): boolean {
    return this.config !== null;
  }

  async call(input: TwirpCall, now = new Date()): Promise<Record<string, unknown>> {
    if (!this.config) throw new LivekitError(503, 'not_configured');
    const res = await this.http(`${twirpBase(this.config.url)}/twirp/${input.method}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${mintServerToken(this.config, input.grant, now)}`, 'content-type': 'application/json' },
      body: JSON.stringify(input.body),
    });
    const text = await res.text();
    const json = parseObject(text);
    if (!res.ok) throw new LivekitError(res.status, typeof json.code === 'string' ? json.code : 'unknown');
    return json;
  }

  /** Disconnects one participant now. Already gone (not_found) counts as done. */
  async removeParticipant(input: { room: string; identity: string }): Promise<void> {
    try {
      await this.call({ method: 'livekit.RoomService/RemoveParticipant', body: input, grant: { roomAdmin: true, room: input.room } });
    } catch (e) {
      if (e instanceof LivekitError && e.code === 'not_found') return;
      throw e;
    }
  }

  /**
   * Creates the room ahead of its first participant (an egress needs an existing room). Returns
   * the existing room when it is already there. Ten empty minutes before LiveKit closes it.
   */
  async createRoom(room: string): Promise<void> {
    await this.call({ method: 'livekit.RoomService/CreateRoom', body: { name: room, empty_timeout: 600 }, grant: { roomCreate: true } });
  }
}

function parseObject(text: string): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
