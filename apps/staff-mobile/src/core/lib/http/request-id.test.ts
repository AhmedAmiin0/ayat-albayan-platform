import { requestId } from './request-id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('a v4 uuid, new on every call', () => {
  expect(requestId()).toMatch(UUID_V4);
  expect(requestId()).not.toBe(requestId());
});

test('without crypto.randomUUID (Hermes) the fallback is still a v4 uuid', () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  try {
    for (let i = 0; i < 50; i++) expect(requestId()).toMatch(UUID_V4);
  } finally {
    if (real) Object.defineProperty(globalThis, 'crypto', real);
  }
});
