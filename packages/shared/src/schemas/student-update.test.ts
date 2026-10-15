import { describe, expect, it } from 'vitest';
import { studentUpdateSchema } from './people.js';

describe('studentUpdateSchema expected_status (R-STU-05)', () => {
  it('accepts a known expected status next to the new one', () => {
    const r = studentUpdateSchema.safeParse({ status: 'paused', expected_status: 'active' });
    expect(r.success && r.data.expected_status).toBe('active');
  });

  it('is optional', () => {
    const r = studentUpdateSchema.safeParse({ level: 'جزء عم' });
    expect(r.success && r.data.expected_status).toBeUndefined();
  });

  it('rejects an unknown status', () => {
    expect(studentUpdateSchema.safeParse({ expected_status: 'gone' }).success).toBe(false);
  });
});
