import { describe, expect, it } from 'vitest';
import { participantIdentitySchema, roomModerationRoutes as routes } from '..';

const ID = '0b9f4a3e-7c1d-4e2a-9b6f-1d2c3e4f5a6b';
const WHO = 'guest-0123456789ab';
const recording = {
  id: 'r1',
  status: 'done',
  started_at: '2026-11-16T17:00:00.000Z',
  ended_at: '2026-11-16T17:30:00.000Z',
  url: 'https://files.example/r1.mp4',
};

describe('roomModerationRoutes (R-CLS)', () => {
  it.each([
    ['removeFromLesson', 'POST /lessons/:id/room/participants/:identity/remove'],
    ['muteInLesson', 'POST /lessons/:id/room/participants/:identity/mute'],
    ['muteInMeeting', 'POST /meetings/:id/participants/:identity/mute'],
    ['shareInLesson', 'POST /lessons/:id/room/participants/:identity/share'],
    ['shareInMeeting', 'POST /meetings/:id/participants/:identity/share'],
    ['lessonRecordings', 'GET /lessons/:id/recordings'],
    ['meetingRecordings', 'GET /meetings/:id/recordings'],
    ['recordingStatus', 'GET /recordings/status'],
    ['endLesson', 'POST /lessons/:id/end'],
  ] as const)('%s keeps the path the api serves today', (key, wire) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
  });

  it('takes a room id as a uuid and leaves the identity check to its own 404', () => {
    const params = routes.muteInLesson.params;
    expect(params.parse({ id: ID, identity: WHO })).toEqual({ id: ID, identity: WHO });
    expect(params.safeParse({ id: 'nope', identity: WHO }).success).toBe(false);
    expect(params.parse({ id: ID, identity: 'x' })).toEqual({ id: ID, identity: 'x' });
  });

  it('knows an identity only in the shape the api mints', () => {
    expect(participantIdentitySchema.safeParse(WHO).success).toBe(true);
    expect(participantIdentitySchema.safeParse('x').success).toBe(false);
    expect(participantIdentitySchema.safeParse('guest-0123456789AB').success).toBe(false);
    expect(routes.lessonRecordings.params.safeParse({ id: 'nope' }).success).toBe(false);
  });

  it('mutes the microphone or the camera, nothing else', () => {
    expect(routes.muteInMeeting.body.parse({ source: 'camera' })).toEqual({ source: 'camera' });
    expect(routes.muteInLesson.body.safeParse({ source: 'screen' }).success).toBe(false);
  });

  it('allows or stops a share with a boolean only', () => {
    expect(routes.shareInLesson.body.parse({ allow: false })).toEqual({ allow: false });
    expect(routes.shareInMeeting.body.safeParse({ allow: 'yes' }).success).toBe(false);
  });

  it('answers the recordings and refuses one in an unknown state', () => {
    expect(routes.lessonRecordings.response.parse([recording])).toEqual([recording]);
    const lost = [{ ...recording, status: 'lost' }];
    expect(routes.meetingRecordings.response.safeParse(lost).success).toBe(false);
    const running = [{ ...recording, ended_at: null, url: null }];
    expect(routes.meetingRecordings.response.parse(running)).toEqual(running);
  });

  it('answers whether rooms are recorded and when the lesson ended', () => {
    const on = { configured: true };
    expect(routes.recordingStatus.response.parse(on)).toEqual(on);
    expect(routes.recordingStatus.response.safeParse({}).success).toBe(false);
    const ended = { endedAt: '2026-11-16T17:30:00.000Z' };
    expect(routes.endLesson.response.parse(ended)).toEqual(ended);
  });
});
