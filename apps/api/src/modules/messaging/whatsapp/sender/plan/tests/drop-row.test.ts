import { describe, expect, it, vi } from 'vitest';
import type { StaffAtSend } from '@/modules/messaging/reminders';
import { dropRow } from '@/modules/messaging/whatsapp/sender/plan/drop-row';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';

const NOW = new Date('2026-10-02T08:00:00Z');
const PHONE = '+966500000001';

function queries(staff: StaffAtSend[] | undefined) {
  return { staffAtSend: vi.fn(async () => staff), expire: vi.fn(async () => undefined) };
}

describe('dropRow', () => {
  it('a row that may go is left alone', async () => {
    const q = queries(undefined);
    await expect(dropRow(q, dueMessage(), NOW)).resolves.toBeNull();
    expect(q.expire).not.toHaveBeenCalled();
  });

  it('a stale row is written failed with its reason', async () => {
    const q = queries(undefined);
    const row = dueMessage({ template_key: 'follow_up_slots', lead_id: 'lead-1', lead: null });
    await expect(dropRow(q, row, NOW)).resolves.toBe('stale');
    expect(q.expire).toHaveBeenCalledWith(row.id, { code: 'stale', text: 'lead deleted' });
  });

  it('a staff alert is checked against its teacher as found now', async () => {
    const q = queries([{ status: 'inactive', phone_e164: PHONE, profile: null }]);
    const row = dueMessage({ template_key: 'teacher_lesson_reminder', phone_e164: PHONE });
    await expect(dropRow(q, row, NOW)).resolves.toBe('stale');
    expect(q.staffAtSend).toHaveBeenCalledWith(row);
  });
});
