// Test-only fakes for BookingInvoices (R-PAY-03, R-MSG-06): Storage, InboundMedia and the queries are mocks.
import { INVOICE_MAX_BYTES } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { vi } from 'vitest';
import type { StorageService } from '../../common/storage/storage.service';
import type { InboundMedia } from '../whatsapp/messages/inbound-media.service';
import { bookingRequest } from './booking.fakes';
import { BookingInvoices } from './booking.invoice';
import type { BookingQueries } from './booking.queries';

export const REQ = 'c1111111-1111-4111-8111-111111111111';
export const MSG = 'd1111111-1111-4111-8111-111111111111';
export const PHONE = '+966552147730';
/** The booked family's phone and the default 10 MB limit (settings.upload_max_mb). */
export const SCOPE = { phones: [PHONE], maxBytes: INVOICE_MAX_BYTES };
export const PATH = `${REQ}/0f0e0d0c-0000-4000-8000-000000000001.png`;
export const upload = { source: 'upload', path: PATH } as const;
export const chat = { source: 'whatsapp', messageId: MSG } as const;

export function setup() {
  const storage = {
    info: vi.fn().mockResolvedValue({ size: 2048, contentType: 'image/png' }),
    head: vi.fn().mockResolvedValue(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0)),
    copy: vi.fn().mockResolvedValue(undefined),
    signedUpload: vi.fn().mockResolvedValue({ bucket: 'invoices', path: 'p', token: 't', signed_url: 'u' }),
  };
  const message = { id: MSG, phone_e164: PHONE };
  const media = {
    load: vi.fn().mockResolvedValue(message),
    cache: vi.fn().mockResolvedValue({ bucket: 'wa-media', path: `${MSG}.png`, mime: 'image/png' }),
  };
  const queries = { invoiceByRequest: vi.fn().mockResolvedValue(null) };
  const invoices = new BookingInvoices(
    storage as unknown as StorageService,
    media as unknown as InboundMedia,
    queries as unknown as BookingQueries,
  );
  return { invoices, storage, media, queries };
}
export const code = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return { status: e.getStatus(), code: (e.getResponse() as { code: string }).code };
};
export const paid = (over: Record<string, unknown> = {}) =>
  bookingRequest({ clientRequestId: REQ, invoice: upload, ...over });
