import { remainingDraft, sendIdFor } from './draft';
import { newClientId } from './client-id';

test('only the sent text leaves the box; words typed meanwhile stay', () => {
  expect(remainingDraft('السلام عليكم', 'السلام عليكم')).toBe('');
  expect(remainingDraft('السلام عليكم ورحمة الله', 'السلام عليكم')).toBe('ورحمة الله');
  expect(remainingDraft('نص آخر', 'السلام عليكم')).toBe('نص آخر');
});

test('a retry of the same text reuses its client_id; other text gets a new one', () => {
  const fresh = () => 'new';
  expect(sendIdFor({ body: 'شكرًا', clientId: 'old' }, 'شكرًا', fresh)).toBe('old');
  expect(sendIdFor({ body: 'شكرًا', clientId: 'old' }, 'شكرًا جزيلًا', fresh)).toBe('new');
  expect(sendIdFor(null, 'شكرًا', fresh)).toBe('new');
});

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('a client_id is a v4 uuid, from the runtime crypto or the fallback', () => {
  expect(newClientId()).toMatch(UUID_V4);
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  expect(newClientId()).toMatch(UUID_V4);
  expect(newClientId()).not.toBe(newClientId());
  if (saved) Object.defineProperty(globalThis, 'crypto', saved);
});
