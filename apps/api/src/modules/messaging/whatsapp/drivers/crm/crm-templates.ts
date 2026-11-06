import { crmTemplateLanguage, crmTemplateName, type TemplateButton } from '@ab/shared';
import { z } from 'zod';
import { templateButtons, templateDisplay } from '@/modules/messaging/whatsapp/messages/wa-json';
import { bodyExamples } from '@/modules/messaging/whatsapp/template-review';
import {
  WaError, type MetaTemplate, type TemplateRow,
} from '@/modules/messaging/whatsapp/whatsapp.types';
import { crmJson, type CrmConn } from './crm-http';

// A crm line's templates through the academy CRM (docs/39): GET templates?sync=1 (the CRM re-syncs
// from Meta first) as MetaTemplate[], and POST templates with the CRM dashboard's TemplatePayload.

/**
 * ponytail: one page of 100 (crmJson keeps `data` only; the academy has ~12). Page on
 * meta.next_cursor past that.
 */
const LIST_PATH = 'templates?sync=1&limit=100';

const rowSchema = z.object({
  name: z.string(),
  language: z.string(),
  status: z.string(),
  category: z.string().nullish(),
  meta_template_id: z.string().nullable(),
  quality_score: z.string().nullable(),
  rejection_reason: z.string().nullable(),
});
type CrmRow = z.infer<typeof rowSchema>;

const savedSchema = z.object({ meta_template_id: z.string(), status: z.string() });
interface CrmSaved { metaId: string; status: string }

const toMeta = (r: CrmRow): MetaTemplate => ({
  id: r.meta_template_id ?? '',
  name: r.name,
  language: r.language,
  status: r.status,
  category: r.category ?? '',
  quality: r.quality_score,
  components: [],
  rejectedReason: r.rejection_reason,
});

const onMeta = (r: CrmRow): boolean => r.status.toUpperCase() !== 'DRAFT';

/** The CRM's rows after it re-syncs from Meta. DRAFT was never on Meta, so it reads as absent. */
export async function crmTemplates(conn: CrmConn): Promise<MetaTemplate[]> {
  const rows = z.array(rowSchema).safeParse(await crmJson(conn, { path: LIST_PATH }));
  if (!rows.success) throw new WaError('the CRM answered an unreadable template list', { code: null, status: 200 });
  return rows.data.filter(onMeta).map(toMeta);
}

const PARAM = '{{1}}';
type UrlButton = Extract<TemplateButton, { type: 'url' }>;
/** The {{1}} suffix's sample: the row's own (teacher_lesson_v3), else «sample». */
const urlExample = (b: UrlButton) =>
  (b.url.includes(PARAM) ? { example: b.url.replace(PARAM, b.example ?? 'sample') } : {});

const urlButton = (b: UrlButton) =>
  ({ type: 'URL', text: b.text ?? '', url: b.url, ...urlExample(b) });
const crmButton = (b: TemplateButton): object =>
  (b.type === 'url' ? urlButton(b) : { type: 'QUICK_REPLY', text: b.text });

/** A text header from the synced display; a document header (report_ready) is never sent here. */
function crmHeader(row: TemplateRow): object {
  const head = row.header_format === 'document' ? null : templateDisplay(row.display)?.header;
  return head?.type === 'text' && head.text ? { header_type: 'text', header_content: head.text } : {};
}

const capitalised = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** The CRM dashboard's TemplatePayload, under the name and language the sends and the sync use. */
export function crmTemplatePayload(row: TemplateRow): Record<string, unknown> {
  const examples = bodyExamples(row);
  return {
    name: crmTemplateName(row),
    language: crmTemplateLanguage(row),
    category: capitalised(row.category),
    ...crmHeader(row),
    body_text: row.body_ar,
    ...(row.footer_ar ? { footer_text: row.footer_ar } : {}),
    buttons: templateButtons(row.buttons).map(crmButton),
    ...(examples.length ? { sample_values: { body: examples } } : {}),
  };
}

/** POST templates: 201 {data:{meta_template_id, status, …}}; anything unreadable is a WaError. */
export async function crmSubmit(conn: CrmConn, row: TemplateRow): Promise<CrmSaved> {
  const body = crmTemplatePayload(row);
  const saved = savedSchema.safeParse(await crmJson(conn, { path: 'templates', method: 'POST', body }));
  if (!saved.success) throw new WaError('the CRM answered without a meta_template_id', { code: null, status: 201 });
  return { metaId: saved.data.meta_template_id, status: saved.data.status };
}
