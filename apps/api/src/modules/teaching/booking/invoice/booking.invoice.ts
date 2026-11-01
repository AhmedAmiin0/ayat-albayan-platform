import {
  bookingKindOf,
  INVOICE_MAX_BYTES,
  INVOICE_MIMES,
  type BookingRequest,
  type InvoiceInput,
  type InvoiceUpload,
  type SignedUpload,
} from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BUCKETS,
  chatName,
  invoicePath,
  isPathOf,
  uploadName,
} from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { baseMime, InboundMedia } from '@/modules/messaging/whatsapp/messages/inbound-media.service';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { SNIFF_BYTES, sniffMime } from './invoice-sniff';
import type { InvoiceRow } from '@/modules/teaching/booking/core/booking.mapper';
import { BookingRepo } from '@/modules/teaching/booking/core/booking.repo';

const bad = (code: string) => domainError(HttpStatus.BAD_REQUEST, code);
type Kind = InvoiceRow['kind'];
type Saved = Pick<InvoiceRow, 'path' | 'mime' | 'size_bytes'>;
/**
 * The booked families' phones, and settings.upload_max_mb in bytes. `waived`: the caller's
 * server-side option (BookingPlanner PrepareOptions.invoiceWaived, the assistant's course): no
 * invoice is then null instead of 400 invoice_required.
 */
type InvoiceScope = { phones: readonly string[]; maxBytes: number; waived?: boolean };

/**
 * The فاتورة of a non-trial booking (R-PAY-03, R-MSG-06): a file in the private `invoices` bucket,
 * either uploaded by the client to a signed URL or copied by the server from a WhatsApp image / PDF
 * of the booked family's own chat. Mime and size are always read from Storage, never trusted from
 * the client. `resolve` runs after the plan was checked, so a clash never copies a file.
 */
@Injectable()
export class BookingInvoices {
  constructor(
    private readonly storage: StorageService,
    private readonly media: InboundMedia,
    private readonly queries: BookingRepo,
  ) {}

  /** POST /booking/invoice-upload-url: a signed PUT for invoices/{clientRequestId}/{uuid}.{ext}; 400 invoice_too_large over maxBytes. */
  uploadUrl(input: InvoiceUpload, maxBytes = INVOICE_MAX_BYTES): Promise<SignedUpload> {
    if (input.size > maxBytes) return Promise.reject(bad('invoice_too_large'));
    const path = invoicePath({ requestId: input.clientRequestId, name: uploadName(input.mime) });
    return this.storage.signedUpload({ bucket: BUCKETS.invoices, path });
  }

  /**
   * The invoice row to store, null for a trial (a stray invoice is dropped) or a waived one. 400 invoice_required /
   * request_id_required / invoice_path / invoice_message / invoice_type, 410 media_expired, 413.
   * A replay (the request already stored its invoice) returns that row and copies nothing.
   */
  async resolve(req: BookingRequest, scope: InvoiceScope): Promise<InvoiceRow | null> {
    const kind = bookingKindOf(req);
    if (kind === 'trial') return null;
    if (!req.invoice && scope.waived) return null;
    if (!req.invoice) throw bad('invoice_required');
    const requestId = req.clientRequestId;
    if (!requestId) throw bad('request_id_required');
    const stored = await this.queries.invoiceByRequest(requestId);
    if (stored) return stored;
    return req.invoice.source === 'upload'
      ? this.fromUpload({ input: req.invoice, requestId, kind, maxBytes: scope.maxBytes })
      : this.fromChat({ input: req.invoice, requestId, kind, ...scope });
  }

  private async fromUpload(a: { input: Extract<InvoiceInput, { source: 'upload' }>; requestId: string; kind: Kind; maxBytes: number }): Promise<InvoiceRow> {
    if (!isPathOf(a.input.path, a.requestId)) throw bad('invoice_path');
    const info = await this.storage.info({ bucket: BUCKETS.invoices, path: a.input.path });
    if (!info) throw bad('invoice_path');
    const saved = this.checked({ path: a.input.path, mime: baseMime(info.contentType), size_bytes: info.size }, a.maxBytes);
    // Storage trusts the Content-Type the browser PUT with: the bytes must agree with it.
    const head = await this.storage.head({ bucket: BUCKETS.invoices, path: a.input.path }, SNIFF_BYTES);
    if (!head || sniffMime(head) !== saved.mime) throw bad('invoice_type');
    return { ...saved, kind: a.kind, source: 'upload', message_id: null };
  }

  private async fromChat(a: {
    input: Extract<InvoiceInput, { source: 'whatsapp' }>;
    requestId: string;
    kind: Kind;
    phones: readonly string[];
    maxBytes: number;
  }): Promise<InvoiceRow> {
    const msg = await this.media.load(a.input.messageId);
    // Only the booked family's own chat: never copy another family's file (R-NFR-02).
    if (!a.phones.includes(msg.phone_e164)) throw bad('invoice_message');
    const from = await this.media.cache(msg);
    const path = invoicePath({ requestId: a.requestId, name: chatName(msg.id, from.mime) });
    await this.storage.copy({ from: { bucket: from.bucket, path: from.path }, to: { bucket: BUCKETS.invoices, path } });
    const info = await this.storage.info({ bucket: BUCKETS.invoices, path });
    if (!info) throw new Error('invoice copy is missing after copy');
    const saved = this.checked({ path, mime: from.mime, size_bytes: info.size }, a.maxBytes);
    return { ...saved, kind: a.kind, source: 'whatsapp', message_id: msg.id };
  }

  /** What Storage reports must be an image / PDF of 1 byte to maxBytes (settings.upload_max_mb). */
  private checked(file: Saved, maxBytes: number): Saved {
    if (!(INVOICE_MIMES as readonly string[]).includes(file.mime)) throw bad('invoice_type');
    if (file.size_bytes < 1 || file.size_bytes > Math.min(maxBytes, INVOICE_MAX_BYTES)) throw bad('invoice_too_large');
    return file;
  }
}
