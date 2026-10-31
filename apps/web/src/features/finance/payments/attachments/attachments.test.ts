import type { PaymentAttachmentView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { apiErrorText } from '@/features/finance/subscriptions';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { addAttachments, attachmentLabels } from './attachments';

const file = (type: string, size = 10) => new File([new Uint8Array(size)], `f.${type.split('/')[1] ?? 'x'}`, { type });
const wrap = (f: File) => f;
const row = (id: string, legacy = false): PaymentAttachmentView => ({ id, mime: 'image/jpeg', size: 1, url: `https://s/${id}`, expires_at: '', legacy });

describe('payment attachments «المرفقات»', () => {
  it('adds good files, leaves out a wrong type or a too large one and says why', () => {
    const jpg = file('image/jpeg');
    expect(addAttachments([], [jpg], { maxBytes: 100, wrap })).toEqual({ list: [jpg], problem: null });
    expect(addAttachments([], [file('text/plain'), jpg], { maxBytes: 100, wrap })).toEqual({ list: [jpg], problem: 'receipt_type' });
    expect(addAttachments([], [file('application/pdf', 200)], { maxBytes: 100, wrap })).toEqual({ list: [], problem: 'receipt_too_large' });
  });

  it('never more than five', () => {
    const six = Array.from({ length: 6 }, () => file('image/png'));
    const res = addAttachments([], six, { maxBytes: 100, wrap });
    expect(res.list).toHaveLength(5);
    expect(res.problem).toBe('too_many_attachments');
  });

  it('labels: the legacy receipt «الإيصال», then numbered attachments', () => {
    expect(attachmentLabels([row('receipt', true), row('a'), row('b')])).toEqual([
      t.payments.legacyReceipt,
      t.payments.attachmentN.replace('{n}', '1'),
      t.payments.attachmentN.replace('{n}', '2'),
    ]);
  });

  it('a file another payment holds (409 attachment_in_use) reads as its own line', () => {
    const e = new ApiError(409, { code: 'attachment_in_use' });
    expect(apiErrorText(e, { ...t.payments.error, ...t.finance.error })).toBe(t.payments.error.attachment_in_use);
  });
});
