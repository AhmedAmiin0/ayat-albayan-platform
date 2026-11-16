import { describe, expect, it } from 'vitest';
import { afterSend } from './composer-text';

describe('afterSend: only what was sent leaves the composer', () => {
  it('the same text: cleared', () => {
    expect(afterSend('مرحبًا', 'مرحبًا')).toBe('');
  });

  it('typed on during the send: the new part stays', () => {
    expect(afterSend('مرحبًا وكيف الحال', 'مرحبًا')).toBe('وكيف الحال');
  });

  it('rewritten during the send: kept as it is', () => {
    expect(afterSend('نص آخر', 'مرحبًا')).toBe('نص آخر');
    expect(afterSend('', 'مرحبًا')).toBe('');
  });
});
