import { describe, expect, it } from 'vitest';
import { crmCopyCountsSchema } from '@/modules/messaging/whatsapp/messages/crm-copy/crm-media-copy.schemas';

const ZERO = { copied: 0, failed: 0, skipped: 0, remaining: 0 };

describe('crmCopyCountsSchema', () => {
  it('keeps the four totals and drops other keys', () => {
    const data = { copied: 4, failed: 1, skipped: 2, remaining: 3, other: 9 };
    const totals = { copied: 4, failed: 1, skipped: 2, remaining: 3 };
    expect(crmCopyCountsSchema.parse(data)).toEqual(totals);
  });

  it('a missing or non-number total reads 0', () => {
    expect(crmCopyCountsSchema.parse({ copied: '4', failed: null })).toEqual(ZERO);
  });

  it('not an object: all zeros', () => {
    for (const data of [null, undefined, 7, 'x', [1, 2]]) {
      expect(crmCopyCountsSchema.parse(data)).toEqual(ZERO);
    }
  });
});
