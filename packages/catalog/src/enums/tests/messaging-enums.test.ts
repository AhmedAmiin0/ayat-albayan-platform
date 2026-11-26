import { describe, expect, it } from 'vitest';
import {
  isWaLine,
  MESSAGE_STATUSES,
  messageStatusSchema,
  TEMPLATE_STATUSES,
  templateStatusSchema,
  WA_LINES,
  waLineSchema,
} from '..';

describe('message and template status schemas', () => {
  it('accept each member of their tuple and nothing else', () => {
    expect(messageStatusSchema.options).toEqual([...MESSAGE_STATUSES]);
    expect(templateStatusSchema.options).toEqual([...TEMPLATE_STATUSES]);
    expect(messageStatusSchema.validate('seen')).toBe(false);
  });
});

describe('waLineSchema', () => {
  it('names the two messaging lines; isWaLine is its predicate', () => {
    expect(waLineSchema.options).toEqual([...WA_LINES]);
    expect(WA_LINES.every(isWaLine)).toBe(true);
    expect([isWaLine('calls'), isWaLine(null), isWaLine(undefined)]).toEqual([false, false, false]);
  });
});
