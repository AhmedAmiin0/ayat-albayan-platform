import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import { ReopenAudit } from './reopen-audit';

const ROW = {
  direction: 'outbound' as const,
  phone_e164: '+966500000001',
  created_by: 'staff-1',
  template_key: 'welcome_greeting',
};

describe('ReopenAudit', () => {
  it('thread_reopen_template under the staff member who pressed send', async () => {
    const record = vi.fn(async () => undefined);
    await new ReopenAudit({ record } as unknown as AuditService).record(ROW, 'm1');
    expect(record).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ actorId: 'staff-1', entityId: 'm1', action: 'thread_reopen_template' }),
    );
  });

  it('a failed audit write never throws (the template is queued) and logs the last 4 digits', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const record = vi.fn(async () => Promise.reject(new Error('db down')));
    await expect(new ReopenAudit({ record } as unknown as AuditService).record(ROW, 'm1')).resolves.toBeUndefined();
    expect(String(warn.mock.calls[0]?.[0])).toContain('…0001');
    warn.mockRestore();
  });
});
