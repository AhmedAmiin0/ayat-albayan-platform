import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { bookingRequest, IDS } from './booking.fakes';
import { chat, code, MSG, paid, PHONE, REQ, setup, upload } from './booking.invoice.fakes';
import { makeupRequest } from './booking.makeup.fakes';

describe('BookingInvoices.resolve — required unless trial (R-PAY-03)', () => {
  it.each([
    ['a package', bookingRequest({ invoice: undefined })],
    ['a makeup', makeupRequest({ invoice: undefined })],
  ])('%s without an invoice → 400 invoice_required', async (_name, req) => {
    const { invoices } = setup();
    expect(await code(invoices.resolve(req, [PHONE]))).toEqual({ status: 400, code: 'invoice_required' });
  });

  it('a trial needs none, and a stray invoice on it is dropped (never stored)', async () => {
    const { invoices, storage } = setup();
    const trial = { package: 'trial', studentIds: [IDS.s1] };
    expect(await invoices.resolve(bookingRequest(trial), [PHONE])).toBeNull();
    expect(await invoices.resolve(paid(trial), [PHONE])).toBeNull();
    expect(storage.info).not.toHaveBeenCalled();
  });

  it('an invoice needs the clientRequestId (the folder and the replay key) → 400 request_id_required', async () => {
    const { invoices } = setup();
    const req = bookingRequest({ invoice: upload });
    expect(await code(invoices.resolve(req, [PHONE]))).toEqual({ status: 400, code: 'request_id_required' });
  });

  it('a makeup stores its kind', async () => {
    const { invoices } = setup();
    const row = await invoices.resolve(makeupRequest({ clientRequestId: REQ, invoice: upload }), [PHONE]);
    expect(row).toMatchObject({ kind: 'makeup', source: 'upload' });
  });
});

describe('BookingInvoices.resolve — saved from the chat (R-MSG-06)', () => {
  const req = () => paid({ invoice: chat });

  it('copies the cached WhatsApp file into the invoices bucket on the server', async () => {
    const { invoices, storage } = setup();
    const row = await invoices.resolve(req(), [PHONE]);
    const to = { bucket: 'invoices', path: `${REQ}/wa-${MSG}.png` };
    expect(storage.copy).toHaveBeenCalledWith({ from: { bucket: 'wa-media', path: `${MSG}.png` }, to });
    expect(row).toEqual({
      kind: 'package',
      path: to.path,
      mime: 'image/png',
      size_bytes: 2048,
      source: 'whatsapp',
      message_id: MSG,
    });
  });

  it('a message from another family\'s chat → 400 invoice_message, nothing downloaded or copied', async () => {
    const { invoices, media, storage } = setup();
    expect(await code(invoices.resolve(req(), ['+201001234567']))).toEqual({ status: 400, code: 'invoice_message' });
    expect(media.cache).not.toHaveBeenCalled();
    expect(storage.copy).not.toHaveBeenCalled();
  });

  it('an expired or unusable message keeps its own error (410 / 400 / 404 from InboundMedia)', async () => {
    const { invoices, media } = setup();
    const gone = new HttpException({ code: 'media_expired' }, 410);
    media.cache.mockRejectedValue(gone);
    expect(await code(invoices.resolve(req(), [PHONE]))).toEqual({ status: 410, code: 'media_expired' });
  });

  it('a retry of the same booking is idempotent: the stored invoice returns, nothing is copied again', async () => {
    const { invoices, queries, media, storage } = setup();
    const stored = { kind: 'package', path: `${REQ}/wa-${MSG}.png`, mime: 'image/png', size_bytes: 2048, source: 'whatsapp', message_id: MSG };
    queries.invoiceByRequest.mockResolvedValue(stored);
    expect(await invoices.resolve(req(), [PHONE])).toEqual(stored);
    expect(media.load).not.toHaveBeenCalled();
    expect(storage.copy).not.toHaveBeenCalled();
  });

  it('saving the same message twice lands on the same object (deterministic name)', async () => {
    const { invoices, storage } = setup();
    await invoices.resolve(req(), [PHONE]);
    await invoices.resolve(req(), [PHONE]);
    const targets = storage.copy.mock.calls.map((c) => (c[0] as { to: { path: string } }).to.path);
    expect(new Set(targets).size).toBe(1);
  });
});

describe('BookingInvoices.uploadUrl', () => {
  it('signs a PUT under the booking\'s own folder: invoices/{clientRequestId}/{uuid}.{ext}', async () => {
    const { invoices, storage } = setup();
    await invoices.uploadUrl({ clientRequestId: REQ, mime: 'application/pdf', size: 10 });
    const [ref] = storage.signedUpload.mock.calls[0] ?? [];
    expect(ref.bucket).toBe('invoices');
    expect(ref.path).toMatch(new RegExp(`^${REQ}/[0-9a-f-]{36}\\.pdf$`));
  });
});
