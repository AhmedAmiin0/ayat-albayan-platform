import { describe, expect, it } from 'vitest';
import {
  MESSAGE_STATUSES,
  messageStatusSchema,
  TEMPLATE_STATUSES,
  templateStatusSchema,
} from '..';

describe('message and template status schemas', () => {
  it('accept each member of their tuple and nothing else', () => {
    expect(messageStatusSchema.options).toEqual([...MESSAGE_STATUSES]);
    expect(templateStatusSchema.options).toEqual([...TEMPLATE_STATUSES]);
    expect(messageStatusSchema.validate('seen')).toBe(false);
  });
});
