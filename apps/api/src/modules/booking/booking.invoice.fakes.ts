// Test-only fakes for BookingInvoices (R-PAY-03, R-MSG-06): Storage, InboundMedia and the queries are mocks.
import { HttpException } from '@nestjs/common';
import { vi } from 'vitest';
import type { StorageService } from '../../common/storage/storage.service';
import type { InboundMedia } from '../whatsapp/inbound-media.service';
import { bookingRequest } from './booking.fakes';
import { BookingInvoices } from './booking.invoice';
import type { BookingQueries } from './booking.queries';

export const REQ = 'c1111111-1111-4111-8111-111111111111';
export const MSG = 'd1111111-1111-4111-8111-111111111111';
export const PHONE = '+966552147730';
export const PATH = `${REQ}/0f0e0d0c-0000-4000-8000-000000000001.png`;
export const upload = { source: 'upload', path: PATH } as const;
export const chat = { source: 'whatsapp', messageId: MSG } as const;

export function setup() {
  const storage = {
    info: vi.fn().mockResolvedValue({ size: 2048, contentType: 'image/png' }),
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
