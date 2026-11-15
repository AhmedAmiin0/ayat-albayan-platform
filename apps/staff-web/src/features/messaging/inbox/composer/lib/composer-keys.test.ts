import { describe, expect, it } from 'vitest';
import { sendsOnKey, type ComposerKey } from './composer-keys';

const key = (
  over: Partial<Omit<ComposerKey, 'nativeEvent'>> & { isComposing?: boolean } = {},
): ComposerKey => {
  const { isComposing = false, ...rest } = over;
  return {
    key: 'Enter',
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    ...rest,
    nativeEvent: { isComposing },
  };
};

describe('which key sends the message', () => {
  it('desktop: plain Enter sends', () => {
    expect(sendsOnKey(key(), true)).toBe(true);
  });

  it('desktop: Shift+Enter is a new line, and an IME still composing keeps its Enter', () => {
    expect(sendsOnKey(key({ shiftKey: true }), true)).toBe(false);
    expect(sendsOnKey(key({ isComposing: true }), true)).toBe(false);
  });

  it('phone: plain Enter is a new line', () => {
    expect(sendsOnKey(key(), false)).toBe(false);
  });

  it.each([true, false])('Ctrl+Enter and ⌘+Enter send (desktop=%s)', (desktop) => {
    expect(sendsOnKey(key({ ctrlKey: true }), desktop)).toBe(true);
    expect(sendsOnKey(key({ metaKey: true }), desktop)).toBe(true);
  });

  it('other keys never send', () => {
    expect(sendsOnKey(key({ key: 'a' }), true)).toBe(false);
    expect(sendsOnKey(key({ key: 'a', ctrlKey: true }), true)).toBe(false);
  });
});
