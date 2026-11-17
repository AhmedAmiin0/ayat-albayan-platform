import { handOff, takeHandoff } from './join-handoff';

const ID = '0a5c2b1e-6c3e-4d61-9a43-1b2f9b8e7d10';
const lesson = { kind: 'lesson', id: ID } as const;
const meeting = { kind: 'meeting', id: ID } as const;

test('the handed-over token is read once', () => {
  const join = { url: 'wss://x', token: 't', room: 'r', role: 'admin' as const };
  handOff(lesson, join);
  expect(takeHandoff(meeting)).toBeNull();
  expect(takeHandoff(lesson)).toEqual({ url: 'wss://x', token: 't', role: 'admin', chat: true });
  handOff(lesson, { ...join, role: 'guest', chat: false });
  expect(takeHandoff(lesson)).toMatchObject({ role: 'guest', chat: false });
  expect(takeHandoff(lesson)).toBeNull();
});
