import { cachedThread, delivered, detail, inbound, PHONE } from '@/inbox/shared/thread-fixtures';
import { deltaWasEmpty, forgetDelta, noteDelta } from './delta-news';

const cache = cachedThread(detail([inbound, delivered]));
const empty = { messages: [], pending: [], has_more: false };

test('nothing recorded yet, or forgotten: not empty (no extra read)', () => {
  forgetDelta(PHONE);
  expect(deltaWasEmpty(PHONE)).toBe(false);
});

test('rows equal to the cached ones (or none) are empty; a new or changed row is news', () => {
  noteDelta(PHONE, cache, { ...empty, pending: [delivered] });
  expect(deltaWasEmpty(PHONE)).toBe(true);
  noteDelta(PHONE, cache, empty);
  expect(deltaWasEmpty(PHONE)).toBe(true);
  noteDelta(PHONE, cache, { ...empty, pending: [{ ...delivered, status: 'read' }] });
  expect(deltaWasEmpty(PHONE)).toBe(false);
  noteDelta(PHONE, undefined, { ...empty, messages: [inbound] });
  expect(deltaWasEmpty(PHONE)).toBe(false);
});
