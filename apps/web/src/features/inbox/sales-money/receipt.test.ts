import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { openPackages } from './SalesMoneyFlow';
import { salesErrorText } from './errors';
import { chatReceiptLabel, receiptError, receiptFor } from './receipt';
import { CHAT_RECEIPTS, OPEN_SUB, student } from './sales-money-fixture';

const chat = { kind: 'chat', messageId: 'm', subscriptionId: 'sub-a', path: 'receipts/sub-a/x.jpg' } as const;

describe('the transfer receipt (R-ASST-04)', () => {
  it('a chat copy counts only for the package it was copied for; a file always counts', () => {
    expect(receiptFor(chat, 'sub-a')).toBe(chat);
    expect(receiptFor(chat, 'sub-b')).toBeNull();
    const file = { kind: 'file', file: new File([], 'r.jpg') } as const;
    expect(receiptFor(file, 'sub-b')).toBe(file);
    expect(receiptFor(null, 'sub-a')).toBeNull();
  });

  it('a chat file is named by its caption (else «الإيصال»), its day, and «expired» when so', () => {
    const [fresh, old] = CHAT_RECEIPTS;
    expect(fresh && chatReceiptLabel(fresh)).toMatch(/^تحويل · /);
    expect(old && chatReceiptLabel(old)).toMatch(new RegExp(`^${t.salesMoney.receipt} · .+ · ${t.salesMoney.receiptExpired}$`));
  });

  it('receiptError: required, and an uploaded file is checked for type and size', () => {
    expect(receiptError(null, 100)).toBe(t.salesMoney.receiptRequired);
    expect(receiptError(chat, 100)).toBeNull();
    const pdf = new File([new Uint8Array(200)], 'r.pdf', { type: 'application/pdf' });
    expect(receiptError({ kind: 'file', file: pdf }, 100)).toBe(t.salesMoney.error.receipt_too_large);
    const txt = new File(['x'], 'r.txt', { type: 'text/plain' });
    expect(receiptError({ kind: 'file', file: txt }, 100)).toBe(t.salesMoney.error.receipt_type);
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
