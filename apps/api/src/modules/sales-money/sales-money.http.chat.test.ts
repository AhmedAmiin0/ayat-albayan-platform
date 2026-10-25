import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, SUB_ID } from '../subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { FAMILY_PHONE, MSG, salesDefaults } from './sales-money.fakes';

const now = new Date().toISOString();
const row = (id: string, mime: string) => ({ id, phone_e164: FAMILY_PHONE, direction: 'inbound', media_id: 'm', media_mime: mime, media_path: null, body: null, created_at: now, line: 'chat' });
const COPY = { subscriptionId: SUB_ID, messageId: MSG };

describe('«اختر صورة الإيصال من المحادثة»: only her student’s family chat, images and PDFs only', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    m.media.load.mockResolvedValue(row(MSG, 'image/jpeg'));
    m.media.cache.mockResolvedValue({ bucket: 'wa-media', path: `${MSG}.jpg`, mime: 'image/jpeg' });
    m.storage.info.mockResolvedValue({ size: 2000, contentType: 'image/jpeg' });
  });

  it('lists the inbound images / PDFs of HER student’s family phone only (an audio note is left out), metadata only', async () => {
    m.mediaQueries.recent.mockResolvedValue([row(MSG, 'image/jpeg'), row('a', 'audio/ogg'), row('p', 'application/pdf')]);
    const res = await call({ method: 'GET', url: `/sales/money/chat-receipts?studentId=${STUDENT_ID}`, token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(m.family.familyPhone).toHaveBeenCalledWith(STUDENT_ID);
    expect(m.mediaQueries.recent).toHaveBeenCalledWith(expect.objectContaining({ phone: FAMILY_PHONE }));
    expect(res.json().map((r: { message_id: string }) => r.message_id)).toEqual([MSG, 'p']);
    expect(Object.keys(res.json()[0]).sort()).toEqual(['caption', 'created_at', 'expired', 'message_id', 'mime']);
    expect(m.media.cache).not.toHaveBeenCalled();
  });

  it('a thumbnail is a signed URL of that chat’s file; a message of another chat → 404', async () => {
    m.storage.signedDownload.mockResolvedValue({ url: 'https://storage.test/x', expires_at: now });
    const ok = await call({ method: 'GET', url: `/sales/money/chat-receipts/${MSG}?studentId=${STUDENT_ID}`, token: 'salesA' });
    expect(ok.json()).toEqual({ url: 'https://storage.test/x', expires_at: now, mime: 'image/jpeg' });
    m.media.load.mockResolvedValue({ ...row(MSG, 'image/jpeg'), phone_e164: '+966559990000' });
    const other = await call({ method: 'GET', url: `/sales/money/chat-receipts/${MSG}?studentId=${STUDENT_ID}`, token: 'salesA' });
    expect(other.statusCode).toBe(404);
  });

  it('copy: server-side into receipts/{subscription}/wa-{message}-{uuid}.jpg, a new object per pick', async () => {
    const res = await call({ method: 'POST', url: '/sales/payments/receipt-from-chat', token: 'salesA', body: COPY });
    expect(res.statusCode).toBe(200);
    const path: string = res.json().receipt_path;
    expect(path).toMatch(new RegExp(`^${SUB_ID}/wa-${MSG}-[0-9a-f-]{36}\\.jpg$`));
    expect(m.storage.copy).toHaveBeenCalledWith({ from: { bucket: 'wa-media', path: `${MSG}.jpg` }, to: { bucket: 'receipts', path } });
    const again = await call({ method: 'POST', url: '/sales/payments/receipt-from-chat', token: 'salesA', body: COPY });
    expect(again.json().receipt_path).not.toBe(path);
  });

  it('copy: a message of another family’s chat → 404 and nothing copied', async () => {
    m.media.load.mockResolvedValue({ ...row(MSG, 'image/jpeg'), phone_e164: '+966559990000' });
    const res = await call({ method: 'POST', url: '/sales/payments/receipt-from-chat', token: 'salesA', body: COPY });
    expect(res.statusCode).toBe(404);
    expect(m.storage.copy).not.toHaveBeenCalled();
  });

  it('copy: a file too large for settings.upload_max_mb → 400 receipt_too_large and the copy removed', async () => {
    m.storage.info.mockResolvedValue({ size: 500 * 1024 * 1024, contentType: 'image/jpeg' });
    const res = await call({ method: 'POST', url: '/sales/payments/receipt-from-chat', token: 'salesA', body: COPY });
    expect([res.statusCode, res.json().code]).toEqual([400, 'receipt_too_large']);
    expect(m.storage.remove).toHaveBeenCalledWith({ bucket: 'receipts', path: expect.stringMatching(new RegExp(`^${SUB_ID}/wa-${MSG}-`)) });
  });
});
