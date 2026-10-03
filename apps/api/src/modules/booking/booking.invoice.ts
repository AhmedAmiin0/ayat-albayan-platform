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
} from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { baseMime, InboundMedia } from '../whatsapp/inbound-media.service';
import { domainError } from './booking.errors';
import type { InvoiceRow } from './booking.mapper';
import { BookingQueries } from './booking.queries';

const bad = (code: string) => domainError(HttpStatus.BAD_REQUEST, code);
type Kind = InvoiceRow['kind'];
type Saved = Pick<InvoiceRow, 'path' | 'mime' | 'size_bytes'>;

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
    private readonly queries: BookingQueries,
  ) {}

  /** POST /booking/invoice-upload-url: a signed PUT for invoices/{clientRequestId}/{uuid}.{ext}. */
  uploadUrl(input: InvoiceUpload): Promise<SignedUpload> {
    const path = invoicePath({ requestId: input.clientRequestId, name: uploadName(input.mime) });
    return this.storage.signedUpload({ bucket: BUCKETS.invoices, path });
  }

  /**
   * The invoice row to store, null for a trial (a stray invoice is dropped). 400 invoice_required /
   * request_id_required / invoice_path / invoice_message / invoice_type, 410 media_expired, 413.
   * A replay (the request already stored its invoice) returns that row and copies nothing.
   */
  async resolve(req: BookingRequest, phones: readonly string[]): Promise<InvoiceRow | null> {
    const kind = bookingKindOf(req);
    if (kind === 'trial') return null;
    if (!req.invoice) throw bad('invoice_required');
    const requestId = req.clientRequestId;
    if (!requestId) throw bad('request_id_required');
    const stored = await this.queries.invoiceByRequest(requestId);
    if (stored) return stored;
    return req.invoice.source === 'upload'
      ? this.fromUpload({ input: req.invoice, requestId, kind })
      : this.fromChat({ input: req.invoice, requestId, kind, phones });
  }

  private async fromUpload(a: { input: Extract<InvoiceInput, { source: 'upload' }>; requestId: string; kind: Kind }): Promise<InvoiceRow> {
    if (!isPathOf(a.input.path, a.requestId)) throw bad('invoice_path');
    const info = await this.storage.info({ bucket: BUCKETS.invoices, path: a.input.path });
    if (!info) throw bad('invoice_path');
    const saved = this.checked({ path: a.input.path, mime: baseMime(info.contentType), size_bytes: info.size });
    return { ...saved, kind: a.kind, source: 'upload', message_id: null };
  }

  private async fromChat(a: {
    input: Extract<InvoiceInput, { source: 'whatsapp' }>;
    requestId: string;
    kind: Kind;
    phones: readonly string[];
  }): Promise<InvoiceRow> {
    const msg = await this.media.load(a.input.messageId);
    // Only the booked family's own chat: never copy another family's file (R-NFR-02).
    if (!a.phones.includes(msg.phone_e164)) throw bad('invoice_message');
    const from = await this.media.cache(msg);
    const path = invoicePath({ requestId: a.requestId, name: chatName(msg.id, from.mime) });
    await this.storage.copy({ from: { bucket: from.bucket, path: from.path }, to: { bucket: BUCKETS.invoices, path } });
    const info = await this.storage.info({ bucket: BUCKETS.invoices, path });
    if (!info) throw new Error('invoice copy is missing after copy');
    const saved = this.checked({ path, mime: from.mime, size_bytes: info.size });
    return { ...saved, kind: a.kind, source: 'whatsapp', message_id: msg.id };
  }

  /** What Storage reports must be an image / PDF of 1 byte to 10 MB. */
  private checked(file: Saved): Saved {
    if (!(INVOICE_MIMES as readonly string[]).includes(file.mime)) throw bad('invoice_type');
    if (file.size_bytes < 1 || file.size_bytes > INVOICE_MAX_BYTES) throw bad('invoice_too_large');
    return file;
  }
}
