import { describe, expect, it } from 'vitest';
import { SHORT_LINK_OUTCOMES, shortLinkOutcomeSchema } from './short-link-views';

describe('shortLinkOutcomeSchema', () => {
  it('accepts each gate outcome and nothing else', () => {
    expect(shortLinkOutcomeSchema.options).toEqual([...SHORT_LINK_OUTCOMES]);
    expect(shortLinkOutcomeSchema.validate('recorded')).toBe(false);
  });
});
