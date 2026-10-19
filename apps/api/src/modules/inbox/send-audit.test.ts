import type { MessageView } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { ADMIN, SALES, TEACHER } from './test-app';
import { recordSend } from './send-audit';

const view = { id: 'm9', phone_e164: '+966501234567', template_key: 'booking_confirmation', status: 'sent', media_mime: null } as MessageView;
const audit = () => ({ record: vi.fn().mockResolvedValue(undefined) });
const sent = (replayed = false) => ({ view, replayed });

describe('recordSend: every inbox send is audited under who sent it', () => {
  it('the admin: phone, template_key and status', async () => {
    const a = audit();
    await expect(recordSend(a as unknown as AuditService, { sent: sent(), action: 'thread_template', user: ADMIN, scope: null, sales: null })).resolves.toBe(view);
    expect(a.record).toHaveBeenCalledWith({
      actorId: ADMIN.id, entity: 'messages', entityId: 'm9', action: 'thread_template', before: null,
      after: { phone: view.phone_e164, template_key: 'booking_confirmation', status: 'sent' },
    });
  });

  it('a teacher is named; a salesperson carries her id', async () => {
    const a = audit();
    const scope = { teacherId: 'tch-1', teacherName: 'أبرار' } as never;
    await recordSend(a as unknown as AuditService, { sent: sent(), action: 'thread_text', user: TEACHER, scope, sales: null });
    await recordSend(a as unknown as AuditService, { sent: sent(), action: 'thread_text', user: SALES, scope: null, sales: { salesId: SALES.id } as never });
    expect(a.record.mock.calls[0]?.[0].after).toMatchObject({ teacher_id: 'tch-1', teacher_name: 'أبرار' });
    expect(a.record.mock.calls[1]?.[0].after).toMatchObject({ sales_id: SALES.id });
  });

  it('a sent file logs its mime and name in place of template_key', async () => {
    const a = audit();
    const media = { media_mime: 'application/pdf', media_name: 'خطة.pdf' };
    await recordSend(a as unknown as AuditService, { sent: sent(), action: 'thread_file', user: SALES, scope: null, sales: { salesId: SALES.id } as never, media });
    expect(a.record.mock.calls[0]?.[0].after).toEqual({ phone: view.phone_e164, ...media, status: 'sent', sales_id: SALES.id });
  });

  it('a replay is not audited again', async () => {
    const a = audit();
    await recordSend(a as unknown as AuditService, { sent: sent(true), action: 'thread_text', user: ADMIN, scope: null, sales: null });
    expect(a.record).not.toHaveBeenCalled();
  });
});
