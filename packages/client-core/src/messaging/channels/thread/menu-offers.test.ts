import { expect, test } from 'vitest';
import { channelMessage } from './channel.fakes.test-util';
import { menuOffers, offersAny } from './menu-offers';

const now = new Date('2026-10-27T10:05:00.000Z');
const mine = channelMessage({ mine: true, created_at: '2026-10-27T10:00:00.000Z' });

test('a writer: reply, who read it, edit and delete within the windows', () => {
  const o = menuOffers({ audience: 'teacher', mode: 'write', message: mine, now });
  expect(o).toEqual({ reply: true, reads: true, edit: true, delete: true });
});

test('a read-only view never offers edit, delete or reply (the API refuses them)', () => {
  const o = menuOffers({ audience: 'sales', mode: 'read', message: mine, now });
  expect(o).toEqual({ reply: false, reads: true, edit: false, delete: false });
});

test('the admin moderates: delete only, on anyone’s message', () => {
  const theirs = channelMessage({ created_at: '2026-10-20T10:00:00.000Z' });
  const o = menuOffers({ audience: 'admin', mode: 'read', message: theirs, now });
  expect(o).toEqual({ reply: false, reads: false, edit: false, delete: true });
});

test('a deleted message offers nothing', () => {
  const gone = channelMessage({ mine: true, deleted: true, created_at: mine.created_at });
  expect(offersAny(menuOffers({ audience: 'teacher', mode: 'write', message: gone, now }))).toBe(
    false,
  );
});

test('a message still on its way offers nothing', () => {
  const pending = channelMessage({ id: 'pending:c1', mine: true, created_at: mine.created_at });
  expect(offersAny(menuOffers({ audience: 'teacher', mode: 'write', message: pending, now }))).toBe(
    false,
  );
});
