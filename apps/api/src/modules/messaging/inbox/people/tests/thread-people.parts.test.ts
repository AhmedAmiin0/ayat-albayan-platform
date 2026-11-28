import { describe, expect, it } from 'vitest';
import { threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { guardianOf, leadOf } from '@/modules/messaging/inbox/people/thread-people';

describe('guardianOf', () => {
  it('is null without a row or a guardian id', () => {
    expect(guardianOf(null)).toBeNull();
    expect(guardianOf(threadRow({ guardian_id: null }))).toBeNull();
  });

  it('names the guardian, an empty name when the row has none', () => {
    const row = threadRow({ guardian_id: 'g1', guardian_name: 'ولي الأمر' });
    expect(guardianOf(row)).toEqual({ id: 'g1', name: 'ولي الأمر' });
    expect(guardianOf({ ...row, guardian_name: null })).toEqual({ id: 'g1', name: '' });
  });
});

describe('leadOf', () => {
  it('is null without a row, a lead id or a lead status', () => {
    expect(leadOf(null)).toBeNull();
    expect(leadOf(threadRow({ lead_id: null }))).toBeNull();
    expect(leadOf(threadRow({ lead_id: 'l1', lead_status: null }))).toBeNull();
  });

  it('is the lead with its status', () => {
    expect(leadOf(threadRow({ lead_id: 'l1', lead_status: 'new' }))).toEqual({
      id: 'l1',
      status: 'new',
    });
  });
});
