import { describe, expect, it } from 'vitest';
import { drainCounterSchema, settleStateSchema } from './outbox.schemas';

describe('outbox enums', () => {
  it('names the three settle states', () => {
    expect(settleStateSchema.options).toEqual(['done', 'retry', 'parked']);
  });

  it('names the drain summary counters a settled row adds to', () => {
    expect(drainCounterSchema.options).toEqual(['done', 'retried', 'parked']);
  });
});
