import { handOff, takeHandoff } from './join-handoff';
import { joinPath, parseTarget, roomRoute, roomWebUrl } from './join-target';
import { roomMode } from './room-mode';

const ID = '0a5c2b1e-6c3e-4d61-9a43-1b2f9b8e7d10';
const lesson = { kind: 'lesson', id: ID } as const;
const meeting = { kind: 'meeting', id: ID } as const;

test('the web room join endpoints, unchanged', () => {
  expect(joinPath(lesson)).toBe(`/lessons/${ID}/room/join`);
  expect(joinPath(meeting)).toBe(`/meetings/${ID}/join`);
});

test('the browser fallback is the web page of the same room', () => {
  expect(roomWebUrl(lesson)).toBe(`https://app.ayatalbayan.com/classroom/${ID}`);
  expect(roomWebUrl(meeting)).toBe(`https://app.ayatalbayan.com/meeting/${ID}`);
});

test('the route and its params round-trip; anything else is refused', () => {
  expect(roomRoute(meeting)).toBe(`/room/meeting/${ID}`);
  expect(parseTarget('meeting', ID)).toEqual(meeting);
  expect(parseTarget('lesson', ID)).toEqual(lesson);
  expect(parseTarget('other', ID)).toBeNull();
  expect(parseTarget('lesson', '../x')).toBeNull();
  expect(parseTarget('lesson', ['a'])).toBeNull();
});

test('in the app only with the setting on AND the native module present', () => {
  expect(roomMode(true, true)).toBe('app');
  expect(roomMode(false, true)).toBe('browser');
  expect(roomMode(true, false)).toBe('browser');
});

test('the handed-over token is read once', () => {
  const join = { url: 'wss://x', token: 't', room: 'r', role: 'admin' as const };
  handOff(lesson, join);
  expect(takeHandoff(meeting)).toBeNull();
  expect(takeHandoff(lesson)).toEqual({ url: 'wss://x', token: 't' });
  expect(takeHandoff(lesson)).toBeNull();
});
