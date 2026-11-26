import { describe, expect, it } from 'vitest';
import { SKIP_WHYS, skipReasonSchema, skipWhySchema } from './skip.schemas';

describe('drive backup skip schemas', () => {
  it('name why a part skipped an object and what the admins are told', () => {
    expect(skipReasonSchema.options).toEqual(['missing', 'read_failed', 'changed']);
    expect(skipWhySchema.options).toEqual([...SKIP_WHYS]);
  });
});
