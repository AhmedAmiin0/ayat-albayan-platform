// Contracts shared by every stage: extract → map → resolve → plan → apply → validate (README.md).

/** Target entities in apply (dependency) order. Same names as the target tables, except report_pdfs (Storage). */
export const APPLY_ORDER = [
  'teachers',
  'guardians',
  'students',
  'leads',
  'job_applicants',
  'schedule_rules',
  'schedule_rule_students',
  'lessons',
  'lesson_students',
  'lesson_reports',
  'report_pdfs',
  'subscriptions',
  'payments',
  'expenses',
  'message_templates',
  'messages',
] as const;
export type EntityName = (typeof APPLY_ORDER)[number];

export type TargetName = 'local' | 'staging' | 'production';

/**
 * One extracted cell. Sheet dates/times keep their wall clock (no zone, never `Z`):
 * 'YYYY-MM-DD', 'HH:mm' or 'YYYY-MM-DDTHH:mm:ss'. Mappers apply the person's tz (src/time.ts).
 */
export type Cell = string | number | boolean | null;

export type SourceAlias = 'HUB' | 'BOOK' | 'REP' | 'SUBS' | 'HEART' | 'FIN' | 'ATT' | 'CRM';

/** Where a value came from. `row` is the 1-based sheet row (CRM: 0); `file` only for multi-file specs (ATT). */
export interface SourceRef {
  source: SourceAlias;
  tab: string;
  row: number;
  file?: string;
  id?: string;
}

/** One sheet row keyed by the field names in sources/headers*.ts — never by column letter. */
export interface SourceRow {
  ref: SourceRef;
  fields: Record<string, Cell>;
}

/** A CRM row as returned by PostgREST (cache/crm/<table>.json). */
export type CrmRow = Record<string, unknown>;

/** docs/02 data defects (A1–A9) plus pipeline-level problems. */
export type IssueCode =
  | 'test_row' // A6 Lorem / TEST / تجربة / نمنم / dummy phones
  | 'bad_date' // A6 outside 2026-08-01..today, or unparseable
  | 'bad_phone' // A8 not E.164-able (Telegram handle, missing country code)
  | 'unknown_teacher' // A3 free text that is no teacher (الفيوم, مصر) or unknown alias
  | 'duplicate' // A7 same natural key and same content: first kept
  | 'conflict' // same natural key, different content: one kept, others for review
  | 'merge_candidate' // A1 similar names under one guardian: owner decides
  | 'sibling_split' // A4 one row named several children: split into students
  | 'free_text_number' // A5 lesson number typed as text: ignored, derived
  | 'unmapped_value' // enum text with no mapping (status, package, grade …)
  | 'missing_field' // required value empty
  | 'missing_ref'; // refers to a record that is neither planned nor in the target

export type IssueSeverity = 'reject' | 'review' | 'warn';

export interface RowIssue {
  code: IssueCode;
  severity: IssueSeverity;
  entity: EntityName;
  ref: SourceRef;
  field?: string;
  /** Short, no personal data beyond what identifies the row for the owner. */
  detail?: string;
}

/** Natural key: stable across runs, built only by src/keys.ts. Stored in import_items(entity, natural_key). */
export interface NaturalKey {
  entity: EntityName;
  key: string;
}

export type Scalar = string | number | boolean | null;
/** jsonb values go in as plain objects; arrays map to Postgres arrays. */
export type ColumnValue = Scalar | readonly Scalar[] | { readonly [k: string]: unknown };

/**
 * A target row before ids exist. Foreign keys are `refs` (column → natural key) and are resolved
 * to uuids at apply time; `columns` never hold a uuid of another imported row.
 */
export interface TargetRecord {
  columns: Record<string, ColumnValue>;
  refs: Record<string, NaturalKey>;
  /** Other spellings of a student's name (rows merged by AB code): matching only, never written or hashed. */
  aliases?: readonly string[];
}

export type Mapped<T = TargetRecord> =
  | { ok: true; key: NaturalKey; value: T; ref: SourceRef; issues: RowIssue[] }
  | { ok: false; ref: SourceRef; issues: RowIssue[] };

/** What the target already holds for a natural key. hash null = adopted (found by unique column, no import_item yet). */
export interface Existing {
  targetId: string | null;
  hash: string | null;
}

export type PlanAction = 'create' | 'update' | 'skip' | 'adopt';

export interface PlanItem {
  key: NaturalKey;
  action: PlanAction;
  /** null for create, and for link tables without an id column. */
  targetId: string | null;
  hash: string;
  record: TargetRecord;
  ref: SourceRef;
}

export type PlanCounts = Partial<
  Record<EntityName, Record<PlanAction | 'reject' | 'review', number>>
>;

export interface Plan {
  target: TargetName;
  createdAt: string;
  items: PlanItem[];
  issues: RowIssue[];
  counts: PlanCounts;
}
