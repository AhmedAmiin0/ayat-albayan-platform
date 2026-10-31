import type { Json, Tables, TablesInsert } from '@ab/db';
import { isWaLine, type TemplateLineSync, type TemplateStatus, type WaLine } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { SharedCache } from '@/common/infra/cache/shared-cache';
import { DB, type Db } from '@/common/db/db.module';
import type { ImportRow } from '@/modules/messaging/whatsapp/templates/sync/template-import';
import type { TemplatePatch } from '@/modules/messaging/whatsapp/templates/sync/template-sync';
import { templateRow, templateRows, type TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

/** One (template, number) approval (docs/23c decision 4). */
export type ApprovalRow = Tables<'message_template_numbers'>;
export type ApprovalWrite = TablesInsert<'message_template_numbers'>;
/** What the per-number routes need of a wa_numbers row (ids only, never a secret). */
export type NumberRef = Pick<Tables<'wa_numbers'>, 'id' | 'purpose' | 'is_default' | 'waba_id'>;

/** How long cached() trusts its copy of a template (another API copy may have written since). */
const TEMPLATE_COPY_MS = 60_000;
/** A row, or null when none matched. */
type MaybeRow = TemplateRow | null;

/** message_templates (R-MSG-01): the API is its only writer (sync and import, create, submit, starter flag). */
@Injectable()
export class TemplatesQueries {
  /** cached(): one read per key a minute, shared by concurrent callers; cleared by every write here. */
  private readonly copies = new Map<string, { row: Promise<TemplateRow | null>; at: number }>();

  constructor(
    @Inject(DB) private readonly db: Db,
    @Optional() private readonly shared?: SharedCache,
  ) {
    shared?.on('templates', () => this.copies.clear());
  }

  /**
   * A thread's bubbles render each templated row (≤ 50 a page, mostly the same few keys): an in-memory
   * copy instead of a read per row. Dropped on update / insert here (template sync, submit, edits);
   * another API copy's write (Redis: `templates`) drops it at once, else within TEMPLATE_COPY_MS. Display only: sends read get().
   */
  cached(key: string, now = Date.now()): Promise<TemplateRow | null> {
    const hit = this.copies.get(key);
    if (hit && now - hit.at < TEMPLATE_COPY_MS) return hit.row;
    const row = this.get(key);
    this.copies.set(key, { row, at: now });
    row.catch(() => this.copies.delete(key));
    return row;
  }

  /** After a write here: every copy, in this process and (Redis) the others. */
  private forget(): void {
    this.copies.clear();
    void this.shared?.invalidate({ topic: 'templates' });
  }

  async all(): Promise<TemplateRow[]> {
    const { data, error } = await this.db.from('message_templates').select('*').order('key');
    if (error) throw new Error(`templates read failed: ${error.message}`);
    return templateRows(data);
  }

  async get(key: string): Promise<TemplateRow | null> {
    const { data, error } = await this.db.from('message_templates').select('*').eq('key', key).maybeSingle();
    if (error) throw new Error(`template read failed: ${error.message}`);
    return templateRow(data);
  }

  /** `onlyIf`: only while the row still has that status (compare-and-set); null = none matched. */
  async update(key: string, patch: TemplatePatch, onlyIf?: TemplateStatus): Promise<MaybeRow> {
    const base = this.db.from('message_templates').update(patch).eq('key', key);
    const { data, error } = await (onlyIf ? base.eq('status', onlyIf) : base).select('*').maybeSingle();
    this.forget();
    if (error) throw new Error(`template update failed: ${error.message}`);
    return templateRow(data);
  }

  /**
   * A template imported from the chat WABA (template-import.ts). Idempotent (rule 8): a row with the same
   * Meta name + language already there is left as it is, and null comes back.
   */
  async insert(row: ImportRow): Promise<TemplateRow | null> {
    const { data, error } = await this.db
      .from('message_templates')
      .upsert(row, { onConflict: 'meta_name,language', ignoreDuplicates: true })
      .select('*')
      .maybeSingle();
    this.forget();
    if (error) throw new Error(`template insert failed: ${error.message}`);
    return templateRow(data);
  }

  /** An admin's new template (templates/create): null = its key or name + language is taken. */
  async create(row: ImportRow): Promise<MaybeRow> {
    const { data, error } = await this.db.from('message_templates').insert(row).select('*').maybeSingle();
    this.forget();
    if (error?.code === '23505') return null;
    if (error) throw new Error(`template create failed: ${error.message}`);
    return templateRow(data);
  }

  /** message_template_numbers (docs/23 phase 5): every row, or one template's. */
  async approvals(key?: string): Promise<ApprovalRow[]> {
    const base = this.db.from('message_template_numbers').select('*');
    const { data, error } = await (key ? base.eq('template_key', key) : base).order('number_id');
    if (error) throw new Error(`template numbers read failed: ${error.message}`);
    return data;
  }

  /** The per-number sync's result, by (template_key, number_id); idempotent (rule 8). */
  async upsertApprovals(rows: readonly ApprovalWrite[]): Promise<number> {
    if (!rows.length) return 0;
    const { error } = await this.db.from('message_template_numbers').upsert([...rows], { onConflict: 'template_key,number_id' });
    if (error) throw new Error(`template numbers write failed: ${error.message}`);
    return rows.length;
  }

  /** A line's last sync result (migration 935), so every API copy shows the same «last sync». */
  async saveLineSync(sync: TemplateLineSync): Promise<void> {
    const row = { line: sync.line, result: sync as unknown as Json, synced_at: sync.checked_at };
    const { error } = await this.db.from('wa_template_line_syncs').upsert(row, { onConflict: 'line' });
    if (error) throw new Error(`template line sync write failed: ${error.message}`);
  }

  async lineSyncs(): Promise<Map<WaLine, TemplateLineSync>> {
    const { data, error } = await this.db.from('wa_template_line_syncs').select('line, result');
    if (error) throw new Error(`template line syncs read failed: ${error.message}`);
    const rows = data.flatMap((r) => (isWaLine(r.line) ? [[r.line, r] as const] : []));
    return new Map(rows.map(([line, r]) => [line, r.result as unknown as TemplateLineSync]));
  }

  /** null = no such wa_numbers row. */
  async numberRef(id: string): Promise<NumberRef | null> {
    const { data, error } = await this.db.from('wa_numbers').select('id, purpose, is_default, waba_id').eq('id', id).maybeSingle();
    if (error) throw new Error(`number read failed: ${error.message}`);
    return data;
  }
}
