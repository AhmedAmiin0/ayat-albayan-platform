import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { openPackages } from '../SalesMoneyFlow';
import { salesErrorText } from '../errors';
import { addChatChoice, attachmentItem, attachmentsFor, chatReceiptLabel, pickedMessages } from './receipt';
import { CHAT_RECEIPTS, OPEN_SUB, student } from '../sales-money-fixture';

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

  it('a chat file is added once per message (a second pick is a new copy path), never past five', () => {
    expect(addChatChoice([chat], chat)).toEqual({ list: [chat], problem: null });
    expect(addChatChoice([chat], { ...chat, path: 'receipts/sub-a/y.jpg' }).list).toEqual([chat]);
    expect(addChatChoice([chat], { ...chat, subscriptionId: 'sub-b' }).list).toHaveLength(2);
    expect(attachmentItem(chat, 0).key).toBe('chat-sub-a-m');
    const file = { kind: 'file', file: new File([], 'r.jpg') } as const;
    expect([...pickedMessages([chat, file, { ...chat, messageId: 'n', subscriptionId: 'sub-b' }], 'sub-a')]).toEqual(['m']);
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
    expect(salesErrorText(new ApiError(400, { code: 'start_date_past' }))).toBe(t.salesMoney.error.start_date_past);
    expect(salesErrorText(new ApiError(403, { code: 'start_date_not_allowed' }))).toBe(t.salesMoney.error.start_date_not_allowed);
    expect(salesErrorText(new ApiError(400, { code: 'attachment_type' }))).toBe(t.salesMoney.error.attachment_type);
    expect(salesErrorText(new ApiError(409, { code: 'attachment_in_use' }))).toBe(t.salesMoney.error.attachment_in_use);
    expect(salesErrorText(new ApiError(500, { code: 'boom' }))).toBe(t.salesMoney.error.generic);
    expect(salesErrorText(new TypeError('Failed to fetch'))).toBe(t.salesMoney.error.generic);
  });
});
