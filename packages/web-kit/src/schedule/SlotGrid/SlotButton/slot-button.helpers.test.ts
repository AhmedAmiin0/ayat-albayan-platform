import { describe, expect, it } from 'vitest';
import { slotLook } from './slot-button.helpers';

describe('slotLook', () => {
  it('picked wins over busy', () => {
    expect(slotLook(true, true)).toContain('border-lapis');
  });

  it('an unpicked start with conflicts reads busy, else free', () => {
    expect(slotLook(false, true)).toContain('border-dashed');
    expect(slotLook(false, false)).toContain('bg-raised');
  });
});
