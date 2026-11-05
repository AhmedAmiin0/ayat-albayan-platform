import { describe, expect, it } from 'vitest';
import { parseSalesFamily } from './student-family.js';

const FAMILY = {
  guardian_name: 'ولي الأمر',
  contact_is_self: false,
  siblings: [{ id: 's2', code: 'AB-0002', name: 'أخ', status: 'active' }],
};

describe('parseSalesFamily', () => {
  it('reads the family block', () => {
    expect(parseSalesFamily(FAMILY)).toEqual(FAMILY);
  });

  it('keeps a null guardian name (no chats) and a sibling without a code', () => {
    const sibling = { ...FAMILY.siblings[0], code: null };
    const family = { ...FAMILY, guardian_name: null, siblings: [sibling] };
    expect(parseSalesFamily(family)).toEqual(family);
  });

  it.each([
    ['absent (an older API)', undefined],
    ['an unknown status', { ...FAMILY, siblings: [{ ...FAMILY.siblings[0], status: 'x' }] }],
    ['no siblings array', { guardian_name: null, contact_is_self: true }],
  ])('%s reads as no family', (_, value) => {
    expect(parseSalesFamily(value)).toBeNull();
  });
});
