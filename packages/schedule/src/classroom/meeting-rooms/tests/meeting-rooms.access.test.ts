import { describe, expect, it } from 'vitest';
import { meetingRoomRoutes as routes } from '..';

describe('meetingRoomRoutes access', () => {
  it.each([
    ['create', 'meetings.write'],
    ['list', 'meetings.read'],
    ['byLink', 'meetings.read'],
    ['end', 'meetings.write'],
    ['newLink', 'meetings.write'],
    ['join', 'meetings.write'],
    ['remove', 'meetings.write'],
  ] as const)('%s lets %s in and is tagged classroom', (key, permission) => {
    expect(routes[key].permissions).toEqual([permission]);
    expect(routes[key].tags).toEqual(['classroom']);
  });

  it.each(['publicView', 'guestJoin'] as const)('%s is public: tagged, no permission', (key) => {
    expect(routes[key]).not.toHaveProperty('permissions');
    expect(routes[key].tags).toEqual(['classroom']);
  });
});
