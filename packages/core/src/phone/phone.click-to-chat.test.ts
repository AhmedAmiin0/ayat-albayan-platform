import { describe, expect, it } from 'vitest';
import { clickToChatLink } from './phone.js';

describe('clickToChatLink (R-MSG-03)', () => {
  it('drops the + and encodes Arabic, new lines and &', () => {
    expect(clickToChatLink('+966598917071', 'حلقة سهيلة\nالساعة 5 & 6')).toBe(
      'https://wa.me/966598917071?text=%D8%AD%D9%84%D9%82%D8%A9%20%D8%B3%D9%87%D9%8A%D9%84%D8%A9%0A%D8%A7%D9%84%D8%B3%D8%A7%D8%B9%D8%A9%205%20%26%206',
    );
  });

  it('no text → the bare chat link', () => {
    expect(clickToChatLink('+201001234567')).toBe('https://wa.me/201001234567');
    expect(clickToChatLink('+201001234567', '')).toBe('https://wa.me/201001234567');
  });
});
