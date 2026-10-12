import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { openPackages } from './SalesMoneyFlow';
import { salesErrorText } from './errors';
import { addChatChoice, attachmentItem, attachmentsFor, chatReceiptLabel } from './receipt';
import { CHAT_RECEIPTS, OPEN_SUB, student } from './sales-money-fixture';

const chat = { kind: 'chat', messageId: 'm', subscriptionId: 'sub-a', path: 'receipts/sub-a/x.jpg', label: 'تحويل' } as const;

describe('the transfer attachments (R-ASST-04)', () => {
  it('a chat copy counts only for the package it was copied for; a file always counts', () => {
    const file = { kind: 'file', file: new File([], 'r.jpg') } as const;
    expect(attachmentsFor([chat, file], 'sub-a')).toEqual([chat, file]);
    expect(attachmentsFor([chat, file], 'sub-b')).toEqual([file]);
    expect(attachmentsFor([], 'sub-a')).toEqual([]);
    expect(attachmentItem(chat, 0).name).toBe('تحويل');
    expect(attachmentItem(file, 1)).toEqual({ key: 'file-1-r.jpg', name: 'r.jpg' });
  });

  it('a chat file is added once, never past five', () => {
    expect(addChatChoice([chat], chat)).toEqual({ list: [chat], problem: null });
    const five = Array.from({ length: 5 }, (_, i) => ({ ...chat, messageId: `m${i}`, path: `p${i}` }));
    expect(addChatChoice(five, chat)).toEqual({ list: five, problem: 'too_many_attachments' });
    expect(addChatChoice([], chat).list).toEqual([chat]);
  });

  it('a chat file is named by its caption (else «الإيصال»), its day, and «expired» when so', () => {
    const [fresh, old] = CHAT_RECEIPTS;
    expect(fresh && chatReceiptLabel(fresh)).toMatch(/^تحويل · /);
    expect(old && chatReceiptLabel(old)).toMatch(new RegExp(`^${t.salesMoney.receipt} · .+ · ${t.salesMoney.receiptExpired}$`));
  });

  it('the packages still owed, across her students', () => {
    expect(openPackages([student({ open: [OPEN_SUB] }), student({ id: 'x' })])).toEqual([OPEN_SUB]);
  });
});

describe('salesErrorText', () => {
  it('maps the API codes through salesMoney.error, anything else is the generic line', () => {
    expect(salesErrorText(new ApiError(403, { code: 'not_your_student' }))).toBe(t.salesMoney.error.not_your_student);
    expect(salesErrorText(new ApiError(410, { code: 'media_expired' }))).toBe(t.salesMoney.error.media_expired);
    expect(salesErrorText(new ApiError(500, { code: 'boom' }))).toBe(t.salesMoney.error.generic);
    expect(salesErrorText(new TypeError('Failed to fetch'))).toBe(t.salesMoney.error.generic);
  });
});
