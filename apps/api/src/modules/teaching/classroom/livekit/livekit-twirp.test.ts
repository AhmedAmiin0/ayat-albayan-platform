import { describe, expect, it } from 'vitest';
import { errorFor } from '@/common/infra/http/errors';
import type { HttpFailure } from '@/common/infra/http/failure';
import {
  egressAnswer,
  ignoredAnswer,
  LivekitError,
  participantAnswer,
  participantsAnswer,
  roomsAnswer,
  TWIRP_ERRORS,
} from './livekit-twirp';

const where = 'livekit POST /twirp/livekit.RoomService/X';
const status = (code: number, body: unknown): HttpFailure =>
  ({ kind: 'status', status: code, body, text: '', retryAfter: null, where });
const mapped = (f: HttpFailure) => errorFor(TWIRP_ERRORS, f);

describe('TWIRP_ERRORS (today: any non-2xx → LivekitError(status, Twirp code))', () => {
  it('a status keeps its number and the Twirp code', () => {
    const e = mapped(status(404, { code: 'not_found', msg: 'participant not found' }));
    expect(e).toBeInstanceOf(LivekitError);
    expect(e).toMatchObject({ status: 404, code: 'not_found', message: 'livekit 404 not_found' });
  });

  it('a body without a string code is code unknown', () => {
    expect(mapped(status(502, null))).toMatchObject({ status: 502, code: 'unknown' });
    expect(mapped(status(500, { code: 7 }))).toMatchObject({ status: 500, code: 'unknown' });
  });

  it('the deadline (new) is LivekitError 504 timeout', () => {
    expect(mapped({ kind: 'timeout', where })).toMatchObject({ status: 504, code: 'timeout' });
  });

  it('a transport failure stays a plain Error, as fetch threw before', () => {
    const e = mapped({ kind: 'network', reached: false, where });
    expect(e).not.toBeInstanceOf(LivekitError);
    expect(e.message).toBe('livekit: network');
  });

  it('a 2xx of the wrong shape keeps its status (no schema here refuses one)', () => {
    expect(mapped({ kind: 'shape', status: 200, issues: [], where })).toMatchObject({ status: 200 });
  });
});

describe('answer schemas: anything malformed reads as empty, as parseObject did', () => {
  it('lists default to [] on a missing key, a wrong type or a non-object body', () => {
    expect(participantAnswer.parse({})).toEqual({ tracks: [] });
    expect(participantsAnswer.parse({ participants: 'x' })).toEqual({ participants: [] });
    expect(roomsAnswer.parse(null)).toEqual({ rooms: [] });
  });

  it('keeps the list and every other field', () => {
    const rooms = [{ name: 'lesson-1' }];
    expect(roomsAnswer.parse({ rooms, next: 1 })).toEqual({ rooms, next: 1 });
  });

  it('the egress answer keeps both spellings; junk is {}', () => {
    expect(egressAnswer.parse({ egress_id: 'EG_1' })).toEqual({ egress_id: 'EG_1' });
    expect(egressAnswer.parse({ egressId: 'EG_2' })).toEqual({ egressId: 'EG_2' });
    expect(egressAnswer.parse('<html>')).toEqual({});
  });

  it('an ignored answer accepts anything, a non-JSON body (null) included', () => {
    expect(ignoredAnswer.safeParse(null).success).toBe(true);
  });
});
