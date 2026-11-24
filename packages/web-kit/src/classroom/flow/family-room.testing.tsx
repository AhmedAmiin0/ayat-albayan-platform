// Test helper (test-only): the family variant of the room over a fake client.
import type { RoomJoinResult } from '@ab/schedule';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { ClassroomRoom, type ClassroomRoomProps } from '@ab/web-kit/classroom/room/components/ClassroomRoom';
import { MEDIA_CHOICE_KEY } from '@ab/web-kit/classroom/entry/saved-choice';
import type { FakeClient } from '@ab/web-kit/classroom/room/livekit/fake-client';

export const FAMILY_JOIN: RoomJoinResult = {
  url: 'wss://lk.test',
  token: 'tok',
  room: 'lesson-1',
  role: 'guest',
  recording: 'on',
  chat: true,
};

export const CONTEXT = { title: 'حلقة يوسف مع أ. فاطمة', subtitle: 'اليوم 6:30 م' };

/** A choice saved by an earlier join: the room skips the pre-join check. */
export const saveEarlierChoice = () =>
  localStorage.setItem(MEDIA_CHOICE_KEY, JSON.stringify({ mic: true, cam: false }));

type Extra = Omit<ClassroomRoomProps, 'join' | 'make' | 'variant'> & { join?: RoomJoinResult };

// One `make` per client, so a re-render with new props never reconnects.
const makers = new WeakMap<FakeClient, () => FakeClient>();
const makerOf = (client: FakeClient) => {
  const make = makers.get(client) ?? (() => client);
  makers.set(client, make);
  return make;
};

export function familyRoom(client: FakeClient, extra: Extra = {}) {
  const { join = FAMILY_JOIN, ...rest } = extra;
  return (
    <ClassroomRoom join={join} make={makerOf(client)} variant="family" context={CONTEXT} {...rest} />
  );
}

export const openFamilyRoom = (client: FakeClient, extra: Extra = {}) =>
  render(familyRoom(client, extra));

/** A browser whose camera and microphone answer as the test says. */
export function fakeMedia(answer: (c: MediaStreamConstraints) => Promise<MediaStream>) {
  const getUserMedia = vi.fn(answer);
  const enumerateDevices = vi.fn(() => Promise.resolve([] as MediaDeviceInfo[]));
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices },
  });
  return getUserMedia;
}

export const liveStream = (): MediaStream => {
  const track = { stop: vi.fn(), getSettings: () => ({}) };
  return { getTracks: () => [track] } as unknown as MediaStream;
};

export const refused = (): Promise<MediaStream> =>
  Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
