import { describe, expect, it } from 'vitest';
import { autoHeld } from '@/modules/messaging/whatsapp/sender/plan/automatic';

const jobRow = { template_key: 'lesson_reminder', created_by: null };

describe('autoHeld', () => {
  it('holds a job-made automatic row only while automatic messages are OFF', () => {
    expect(autoHeld({ autoOn: false, row: jobRow })).toBe(true);
    expect(autoHeld({ autoOn: true, row: jobRow })).toBe(false);
  });

  it('an admin’s send of the same template goes', () => {
    expect(autoHeld({ autoOn: false, row: { ...jobRow, created_by: 'admin-1' } })).toBe(false);
  });
});
