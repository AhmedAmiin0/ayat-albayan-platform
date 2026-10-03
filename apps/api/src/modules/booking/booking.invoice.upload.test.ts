import { INVOICE_MAX_BYTES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { IDS } from './booking.fakes';
import { code, paid, PATH, PHONE, setup } from './booking.invoice.fakes';

describe('BookingInvoices.resolve — an uploaded file', () => {
  it('mime and size come from Storage, not the client', async () => {
    const { invoices, storage } = setup();
    storage.info.mockResolvedValue({ size: 5120, contentType: 'application/pdf; charset=binary' });
    expect(await invoices.resolve(paid(), [PHONE])).toEqual({
      kind: 'package',
      path: PATH,
      mime: 'application/pdf',
      size_bytes: 5120,
      source: 'upload',
      message_id: null,
    });
    expect(storage.info).toHaveBeenCalledWith({ bucket: 'invoices', path: PATH });
  });

  it('a path of another booking → 400 invoice_path, Storage not even asked', async () => {
    const { invoices, storage } = setup();
    const other = { source: 'upload', path: `${IDS.s1}/x.png` } as const;
    expect(await code(invoices.resolve(paid({ invoice: other }), [PHONE]))).toEqual({ status: 400, code: 'invoice_path' });
    expect(storage.info).not.toHaveBeenCalled();
  });

  it('a path nobody uploaded to → 400 invoice_path', async () => {
    const { invoices, storage } = setup();
    storage.info.mockResolvedValue(null);
    expect(await code(invoices.resolve(paid(), [PHONE]))).toEqual({ status: 400, code: 'invoice_path' });
  });

  it.each([
    ['audio', { size: 10, contentType: 'audio/mpeg' }, 'invoice_type'],
    ['no content type', { size: 10, contentType: '' }, 'invoice_type'],
    ['over 10 MB', { size: INVOICE_MAX_BYTES + 1, contentType: 'image/png' }, 'invoice_too_large'],
    ['empty', { size: 0, contentType: 'image/png' }, 'invoice_too_large'],
  ])('%s → 400 %s', async (_name, info, expected) => {
    const { invoices, storage } = setup();
    storage.info.mockResolvedValue(info);
    expect(await code(invoices.resolve(paid(), [PHONE]))).toEqual({ status: 400, code: expected });
  });
});
