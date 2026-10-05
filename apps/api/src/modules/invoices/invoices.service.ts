import type { InvoiceView, SignedDownload } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { Injectable } from '@nestjs/common';
import { BUCKETS, extFor } from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { notFound } from '../scheduling/errors';
import { InvoicesQueries, type InvoiceRowOut } from './invoices.queries';

export type InvoiceFilter = { ruleId?: string | undefined; studentId?: string | undefined };

/** The API view: everything but the storage path (a file is only opened through download). */
function view(row: InvoiceRowOut): InvoiceView {
  return {
    id: row.id,
    rule_id: row.rule_id,
    kind: row.kind,
    mime: row.mime,
    size_bytes: row.size_bytes,
    source: row.source,
    created_at: new Date(row.created_at).toISOString(),
    students: row.students,
  };
}

/**
 * The فاتورة of bookings (R-PAY-03): who may see them is decided by the controller (admin only;
 * a teacher never sees a payment proof). Views are not audited (ponytail: add if the owner asks).
 */
@Injectable()
export class InvoicesService {
  constructor(
    private readonly queries: InvoicesQueries,
    private readonly storage: StorageService,
  ) {}

  /** By booking (rule) or by student (through the bookings they are on). */
  async list(filter: InvoiceFilter): Promise<InvoiceView[]> {
    const ruleIds = filter.ruleId ? [filter.ruleId] : await this.queries.ruleIdsOf(filter.studentId ?? '');
    return (await this.queries.byRules(ruleIds)).map(view);
  }

  /** The admin list page: newest first, with the payment recorded from each (if any). */
  async recent(f: { from?: string; to?: string; page: number; pageSize: number }) {
    const { rows, total } = await this.queries.recent(f);
    const paid = await this.queries.paymentsOf(rows.map((r) => r.id));
    return { items: rows.map((r) => ({ ...view(r), payment_id: paid.get(r.id) ?? null })), total, page: f.page, pageSize: f.pageSize };
  }

  async one(id: string): Promise<InvoiceView | null> {
    const row = await this.queries.get(id);
    return row ? view(row) : null;
  }

  /** A signed URL for 1 hour; the browser saves it as «AB-0183_فاتورة.png». 404 invoice_not_found. */
  async download(id: string): Promise<SignedDownload> {
    const row = await this.queries.get(id);
    if (!row) throw notFound('invoice_not_found');
    const code = row.students[0]?.code;
    const name = `${code ? `${code}_` : ''}${ar.booking.invoice.downloadName}.${extFor(row.mime)}`;
    return this.storage.signedDownload({ bucket: BUCKETS.invoices, path: row.storage_path, download: name });
  }
}
