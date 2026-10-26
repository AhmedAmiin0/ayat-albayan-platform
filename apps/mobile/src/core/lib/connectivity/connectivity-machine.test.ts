import { AWAY_CHECK_MS, backoffMs, initialConnState, probeOnForeground, reduceConn } from './connectivity-machine';

const connecting = reduceConn(initialConnState, { type: 'networkFailure', at: 1000 });

test('a request with no answer → connecting, from that moment', () => {
  expect(connecting).toMatchObject({ status: 'connecting', since: 1000, attempt: 0 });
  // A second failure keeps the first moment (the 10 s hint counts from it).
  expect(reduceConn(connecting, { type: 'networkFailure', at: 5000 })).toBe(connecting);
});

test('any answer → online; failed probes count up only while connecting', () => {
  const twice = reduceConn(reduceConn(connecting, { type: 'probeFailed' }), { type: 'probeFailed' });
  expect(twice.attempt).toBe(2);
  expect(reduceConn(twice, { type: 'reached' })).toMatchObject({ status: 'online', since: null, attempt: 0 });
  expect(reduceConn(initialConnState, { type: 'probeFailed' })).toBe(initialConnState);
});

test('probe backoff: 1 s, 2 s, 4 s … capped at 30 s', () => {
  expect([0, 1, 2, 3, 4, 5, 6, 10].map(backoffMs)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
});

test('back in the foreground: probe at once while connecting, online only after more than 30 s away', () => {
  const away = (state = initialConnState, at = 0) => reduceConn(state, { type: 'background', at });
  expect(probeOnForeground(away(connecting), 1)).toBe(true);
  expect(probeOnForeground(away(), AWAY_CHECK_MS)).toBe(false);
  expect(probeOnForeground(away(), AWAY_CHECK_MS + 1)).toBe(true);
  expect(probeOnForeground(initialConnState, AWAY_CHECK_MS * 2)).toBe(false); // never left
  expect(reduceConn(away(), { type: 'foreground' })).toMatchObject({ active: true, hiddenAt: null });
});
