import { describe, expect, it } from 'vitest';
import { participantEventOf } from '@/modules/teaching/classroom/livekit/livekit-webhook.room';

describe("participantEventOf: presence in LiveKit's order", () => {
  it('reads createdAt (Unix seconds, string or number) as the event time', () => {
    const joined = {
      event: 'participant_joined',
      room: { name: 'r' },
      participant: { identity: 'g' },
      createdAt: '1795341600',
    };
    expect(participantEventOf(joined)).toEqual({
      kind: 'joined',
      room: 'r',
      identity: 'g',
      at: '2026-11-22T10:00:00.000Z',
    });
    expect(participantEventOf({ ...joined, createdAt: 1795341600 })?.at).toBe(
      '2026-11-22T10:00:00.000Z',
    );
  });

  it('room_finished names the room only', () => {
    expect(participantEventOf({ event: 'room_finished', room: { name: 'r' } })).toEqual({
      kind: 'finished',
      room: 'r',
      identity: '',
      at: null,
    });
  });

  it('a malformed createdAt is not an event we act on', () => {
    expect(
      participantEventOf({ event: 'participant_left', room: { name: 'r' }, createdAt: 'soon' }),
    ).toBeNull();
  });
});
