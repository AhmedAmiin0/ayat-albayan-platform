import { answerNotice, nextPhase, type RoomPhase } from './room-phase';

const G = { mic: 'granted', cam: 'granted' } as const;
const start: RoomPhase = { step: 'checking' };
const live: RoomPhase = { step: 'live' };

test('both allowed already: straight to the preview; else the explanation first', () => {
  expect(nextPhase(start, { type: 'checked', answer: G })).toEqual({
    step: 'preview',
    notice: null,
  });
  expect(nextPhase(start, { type: 'checked', answer: { ...G, cam: 'denied' } })).toEqual({
    step: 'permission',
  });
});

test('the answer sets the preview notice: blocked beats denied; skipping has none', () => {
  const ask: RoomPhase = { step: 'permission' };
  expect(nextPhase(ask, { type: 'answered', answer: { mic: 'denied', cam: 'blocked' } })).toEqual({
    step: 'preview',
    notice: 'blocked',
  });
  expect(nextPhase(ask, { type: 'answered', answer: { mic: 'denied', cam: 'granted' } })).toEqual({
    step: 'preview',
    notice: 'denied',
  });
  expect(nextPhase(ask, { type: 'answered', answer: null })).toEqual({
    step: 'preview',
    notice: null,
  });
  expect(answerNotice(G)).toBeNull();
});

test('preview → joining → live, or failed with the message', () => {
  const joining = nextPhase({ step: 'preview', notice: null }, { type: 'join' });
  expect(joining).toEqual({ step: 'joining' });
  expect(nextPhase(joining, { type: 'joined' })).toEqual(live);
  expect(nextPhase(joining, { type: 'failed', message: 'x' })).toEqual({
    step: 'failed',
    message: 'x',
  });
});

test('LiveKit closing the room: ended, removed, duplicate; reconnecting stays live', () => {
  expect(nextPhase(live, { type: 'status', status: 'reconnecting' })).toBe(live);
  expect(nextPhase(live, { type: 'status', status: 'ended' })).toEqual({
    step: 'closed',
    why: 'ended',
  });
  expect(nextPhase(live, { type: 'status', status: 'removed' })).toEqual({
    step: 'closed',
    why: 'removed',
  });
  expect(nextPhase(live, { type: 'status', status: 'duplicate' })).toEqual({
    step: 'closed',
    why: 'duplicate',
  });
});

test('late events never move a step back', () => {
  const left = nextPhase(live, { type: 'leave' });
  expect(left).toEqual({ step: 'closed', why: 'left' });
  expect(nextPhase(left, { type: 'status', status: 'ended' })).toBe(left);
  expect(nextPhase(left, { type: 'leave' })).toBe(left);
  expect(nextPhase(live, { type: 'joined' })).toBe(live);
  expect(nextPhase(live, { type: 'checked', answer: G })).toBe(live);
  expect(nextPhase({ step: 'failed', message: 'x' }, { type: 'joined' })).toEqual({
    step: 'failed',
    message: 'x',
  });
  expect(nextPhase(start, { type: 'status', status: 'ended' })).toBe(start);
});

test('retry goes back to the preview from a failure or a closed room only', () => {
  expect(nextPhase({ step: 'failed', message: 'x' }, { type: 'retry' })).toEqual({
    step: 'preview',
    notice: null,
  });
  expect(nextPhase({ step: 'closed', why: 'ended' }, { type: 'retry' })).toEqual({
    step: 'preview',
    notice: null,
  });
  expect(nextPhase(live, { type: 'retry' })).toBe(live);
});
