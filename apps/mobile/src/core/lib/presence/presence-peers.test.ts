import type { PresencePeer } from '@ab/shared';
import { byLastSeen, chatStatus, peerOnline } from './presence-peers';

const NOW = new Date('2026-10-30T12:00:00Z');
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();
const peer = (id: string, last: string | null): PresencePeer => ({
  profile_id: id,
  role: 'teacher',
  last_seen_at: last,
});
const offline = { live: false, online: new Set<string>() };

test('on a live watch, online means present on the topic, whatever the last seen', () => {
  const watch = { live: true, online: new Set(['a']) };
  expect(peerOnline(peer('a', null), { watch, now: NOW })).toBe(true);
  expect(peerOnline(peer('b', ago(0)), { watch, now: NOW })).toBe(false);
});

test('without a socket, seen a moment ago reads as online; minutes ago does not', () => {
  expect(peerOnline(peer('a', ago(1)), { watch: offline, now: NOW })).toBe(true);
  expect(peerOnline(peer('a', ago(5)), { watch: offline, now: NOW })).toBe(false);
});

test('the chat: online when any peer is, else the newest last seen; never seen sorts last', () => {
  const peers = [peer('a', ago(30)), peer('b', null), peer('c', ago(5))];
  const status = chatStatus(peers, { watch: offline, now: NOW });
  expect(status).toEqual({ online: false, lastSeenAt: ago(5) });
  const watch = { live: true, online: new Set(['b']) };
  expect(chatStatus(peers, { watch, now: NOW }).online).toBe(true);
  expect(chatStatus([], { watch: offline, now: NOW })).toEqual({ online: false, lastSeenAt: null });
  expect([null, ago(9), ago(2)].sort(byLastSeen)).toEqual([ago(2), ago(9), null]);
});
