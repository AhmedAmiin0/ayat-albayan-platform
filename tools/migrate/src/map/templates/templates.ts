// message_templates ← CRM message_templates, which hold Meta's own text (R-MSG-01, docs/12 §3.4).
// Syncs status, body, footer, buttons and meta id onto the registry row with the same
// (meta_name, language); the seeded rows keep their keys and params. Pure mapping + upsert SQL.
import type { EntityModule, SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { crmRef, text } from '../../sources/crm/rows.ts';
import type { CrmRow, IssueSeverity, Mapped, RowIssue } from '../../types.ts';
import { templateButtons } from './buttons.ts';
import { writeTemplate } from './write.ts';

/** Registry keys whose Meta name differs (migration 141). Any other template: key = Meta name. */
const SEEDED_KEYS: Readonly<Record<string, string>> = { lesson_reminder_v2: 'lesson_reminder' };

/** messages.template_key for a Meta template name (CRM messages.template_name). */
export function templateKeyFor(metaName: string): string {
  return SEEDED_KEYS[metaName] ?? metaName;
}

/** Meta status → template_status. 'skip' = being deleted on Meta: not imported. */
const STATUS: Readonly<Record<string, string>> = {
  APPROVED: 'approved',
  PENDING: 'pending',
  IN_APPEAL: 'pending',
  REJECTED: 'rejected',
  PAUSED: 'paused',
  DISABLED: 'disabled',
  PENDING_DELETION: 'skip',
  DELETED: 'skip',
};
const CATEGORY: Readonly<Record<string, string>> = { UTILITY: 'utility', MARKETING: 'marketing' };
const HEADER: Readonly<Record<string, string | null>> = { NONE: null, DOCUMENT: 'document' };

type IssueInput = Pick<RowIssue, 'code' | 'ref' | 'field' | 'detail'>;
function issue(o: IssueInput, severity: IssueSeverity = 'review'): RowIssue {
  return { entity: 'message_templates', severity, ...o };
}

const upper = (row: CrmRow, col: string, fallback = ''): string =>
  (text(row, col) ?? fallback).toUpperCase();

/** Body variable names for a template the registry does not know yet: var_1 … var_n. */
function paramNames(body: string): string[] {
  const n = Math.max(0, ...[...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])));
  return Array.from({ length: n }, (_, i) => `var_${i + 1}`);
}

function mapTemplate(row: CrmRow): Mapped {
  const ref = crmRef('message_templates', row);
  const name = text(row, 'name');
  const body = text(row, 'body_text');
  if (!name || !body) {
    const field = name ? 'body_text' : 'name';
    return { ok: false, ref, issues: [issue({ code: 'missing_field', ref, field })] };
  }
  const rawStatus = upper(row, 'status');
  const status = STATUS[rawStatus];
  if (status === 'skip') {
    const skipped = issue(
      { code: 'unmapped_value', ref, field: 'status', detail: rawStatus },
      'warn',
    );
    return { ok: false, ref, issues: [skipped] };
  }
  const category = CATEGORY[upper(row, 'category')];
  const header = HEADER[upper(row, 'header_type', 'NONE')];
  const buttons = templateButtons(row['buttons']);
  if (!status || !category || header === undefined || !buttons) {
    const found = { status, category, header_type: header, buttons };
    const fields = Object.entries(found).filter(([, v]) => v === undefined);
    const issues = fields.map(([field]) => issue({ code: 'unmapped_value', ref, field }));
    return { ok: false, ref, issues };
  }
  const columns = {
    key: templateKeyFor(name),
    meta_name: name,
    language: text(row, 'language') ?? 'ar',
    category,
    header_format: header,
    body_ar: body,
    footer_ar: text(row, 'footer_text'),
    // jsonb arrays travel as JSON text (a JS array would bind as a Postgres array).
    params: JSON.stringify(paramNames(body)),
    buttons: JSON.stringify(buttons),
    status,
    meta_id: text(row, 'meta_template_id'),
  };
  const value = { columns, refs: {} };
  return { ok: true, key: keys.messageTemplate(name), value, ref, issues: [] };
}

export function mapTemplates(bundle: Pick<SourceBundle, 'crm'>): Mapped[] {
  return (bundle.crm['message_templates'] ?? []).map(mapTemplate);
}

export const messageTemplatesModule: EntityModule = {
  entity: 'message_templates',
  table: 'message_templates',
  map: mapTemplates,
  write: writeTemplate,
};
