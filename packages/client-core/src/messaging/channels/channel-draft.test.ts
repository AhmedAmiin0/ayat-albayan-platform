import { describe, expect, it } from 'vitest';
import { newClientId, remainingDraft, sendIdFor } from './channel-draft';

describe('remainingDraft: only what was sent leaves the composer', () => {
  it('the same text: cleared', () => {
    expect(remainingDraft({ current: 'مرحبًا', sent: 'مرحبًا' })).toBe('');
  });

  it('typed on during the send: the new part stays', () => {
    expect(remainingDraft({ current: 'مرحبًا وكيف الحال', sent: 'مرحبًا' })).toBe('وكيف الحال');
  });

  it('rewritten or emptied during the send: kept as it is', () => {
    expect(remainingDraft({ current: 'نص آخر', sent: 'مرحبًا' })).toBe('نص آخر');
    expect(remainingDraft({ current: '', sent: 'مرحبًا' })).toBe('');
  });
});

describe('sendIdFor: a retry of the same text reuses its client_id', () => {
  const fresh = () => 'new';
  it('same text → the old id; other text or no attempt → a new one', () => {
    expect(sendIdFor({ body: 'شكرًا', clientId: 'old' }, 'شكرًا', fresh)).toBe('old');
    expect(sendIdFor({ body: 'شكرًا', clientId: 'old' }, 'شكرًا جزيلًا', fresh)).toBe('new');
    expect(sendIdFor(null, 'شكرًا', fresh)).toBe('new');
  });

  it('defaults to newClientId', () => {
    expect(sendIdFor(null, 'شكرًا')).toMatch(UUID_V4);
  });
});

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newClientId', () => {
  it('a v4 uuid, from the runtime crypto or the fallback', () => {
    expect(newClientId()).toMatch(UUID_V4);
    const saved = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      expect(newClientId()).toMatch(UUID_V4);
      expect(newClientId()).not.toBe(newClientId());
    } finally {
      if (saved) Object.defineProperty(globalThis, 'crypto', saved);
    }
  });
});
