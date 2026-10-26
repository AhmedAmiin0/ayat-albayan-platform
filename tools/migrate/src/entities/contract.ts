// The contract every entity builder implements (one file per entity in src/entities/, registered
// in src/entities/index.ts). map() is pure and unit-tested; write() is optional.
import type { TargetStorage } from '../db/storage.ts';
import type { TargetTx } from '../db/target.ts';
import type { Desired } from '../plan/resolve.ts';
import type { ColumnValue, CrmRow, EntityName, Mapped, PlanItem, SourceRow } from '../types.ts';

export interface SourceBundle {
  /** Extracted sheet rows by SheetSpec.id (sources/headers*.ts), e.g. sheets['hub_students']. */
  sheets: Readonly<Record<string, readonly SourceRow[]>>;
  /** CRM rows by table (sources/crm.schema.ts), e.g. crm['contacts']. */
  crm: Readonly<Record<string, readonly CrmRow[]>>;
  /** Accepted records of entities earlier in APPLY_ORDER (after resolve), for cross-entity lookups. */
  earlier: ReadonlyMap<EntityName, readonly Desired[]>;
  /** Local date in Asia/Riyadh at run time ('YYYY-MM-DD'); the A6 window is 2026-08-01..today. */
  today: string;
  /** First local date ('YYYY-MM-DD', Asia/Riyadh) bookings may create lessons on (`--from`); default today. */
  from?: string;
  /** Zip paths of PDFs the owner accepted despite a weak match (cache/pdf-approved.json). */
  approvedPdfs?: ReadonlySet<string>;
}

export interface WriteContext {
  tx: TargetTx;
  item: PlanItem;
  /** columns + refs resolved to target uuids. */
  columns: Record<string, ColumnValue>;
  /** Only for report_pdfs: target Storage, and the bytes reader for zip entries. */
  storage?: TargetStorage;
  readZipEntry?: (path: string) => Uint8Array | undefined;
}

export interface WriteResult {
  targetId: string | null;
  targetPath?: string | null;
}

export interface EntityModule {
  entity: EntityName;
  /** Target table ('public.' implied). report_pdfs: 'storage.objects' (write() required). */
  table: string;
  /**
   * Unique target column whose value equals the natural key (phone_e164, wa_message_id): rows the
   * app created before the import are adopted (import_items row only, no overwrite) instead of
   * colliding on the unique constraint.
   */
  adoptBy?: string;
  /** Which of two different rows with one key survives resolve(). Default 'first'. */
  prefer?: 'first' | 'last';
  /** Pure: bundle → one Mapped per source row (ok with a key from src/keys.ts, or rejected). */
  map(bundle: SourceBundle): Mapped[];
  /**
   * Custom create/update (legacy code_seq with OVERRIDING SYSTEM VALUE, link tables, Storage).
   * Default: create = tx.insert({ table, columns }) returning id; update = tx.update by targetId.
   */
  write?(ctx: WriteContext): Promise<WriteResult>;
}
