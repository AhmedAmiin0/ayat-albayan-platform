// report_pdfs: copy a matched Drive PDF from the zip into the private `reports` bucket at
// {student_id}/{lesson_id}.pdf (the path the app renders to, migration 122) and mark the report's
// PDF ready. Registered in SHEET_MODULES (sources/sheets/modules.ts).
import type { EntityModule, WriteContext, WriteResult } from '../entities/contract.ts';
import { matchPdfs } from './match.ts';

const REPORTS_BUCKET = 'reports';

function text(ctx: WriteContext, col: string): string {
  const v = ctx.columns[col];
  if (typeof v !== 'string' || !v) throw new Error(`report_pdfs ${ctx.item.key.key}: no ${col}`);
  return v;
}

/**
 * Upload first (idempotent: an existing object is kept, so a rolled-back batch re-runs cleanly),
 * then point the report at it. ponytail: an `update` (other zip file chosen) keeps the object
 * already uploaded; delete it in Storage first if the owner wants the other file.
 */
export async function writeReportPdf(ctx: WriteContext): Promise<WriteResult> {
  if (!ctx.storage || !ctx.readZipEntry) {
    throw new Error('report_pdfs needs Storage (SUPABASE_URL + SERVICE_ROLE_KEY) and the zip');
  }
  const zipPath = text(ctx, 'zip_path');
  const bytes = ctx.readZipEntry(zipPath);
  if (!bytes) throw new Error(`report_pdfs: ${ctx.item.ref.row} not in the zip`);
  const path = `${text(ctx, 'student_id')}/${text(ctx, 'lesson_id')}.pdf`;
  await ctx.storage.upload({ bucket: REPORTS_BUCKET, path, bytes, contentType: 'application/pdf' });
  await ctx.tx.update({
    table: 'lesson_reports',
    id: text(ctx, 'report_id'),
    columns: { pdf_path: path, pdf_status: 'ready', pdf_error: null },
  });
  return { targetId: null, targetPath: `${REPORTS_BUCKET}/${path}` };
}

export const reportPdfModule: EntityModule = {
  entity: 'report_pdfs',
  table: 'storage.objects',
  map: matchPdfs,
  write: writeReportPdf,
};
