import { describe, expect, it } from 'vitest';
import { roomModerationRoutes as routes } from '..';

describe('roomModerationRoutes access', () => {
  it.each([
    ['removeFromLesson', 'classroom.kick'],
    ['muteInLesson', 'classroom.moderate'],
    ['muteInMeeting', 'meetings.write'],
    ['shareInLesson', 'classroom.moderate'],
    ['shareInMeeting', 'meetings.write'],
    ['lessonRecordings', 'recordings.read'],
    ['meetingRecordings', 'meetings.read'],
    ['recordingStatus', 'meetings.read'],
    ['endLesson', 'classroom.host'],
  ] as const)('%s lets %s in and is tagged classroom', (key, permission) => {
    expect(routes[key].permissions).toEqual([permission]);
    expect(routes[key].tags).toEqual(['classroom']);
  });
});
