import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';
import { components, type Component } from '@/modules/messaging/whatsapp/templates/sync/template-sync';
import type { MetaTemplate } from '@/modules/messaging/whatsapp/whatsapp.types';

/** How long find() trusts its copy (another API copy may have synced since). */
const COPY_MS = 60_000;
const TABLE = 'crm_template_copies';
const rowSchema = z.object({
  name: z.string(),
  language: z.string(),
  components: z.array(z.unknown()).catch([]),
});
type Copies = Map<string, Component[]>;
interface CopyEntry {
  at: number;
  rows: Promise<Copies>;
}

const keyOf = (name: string, language: string): string => `${name}:${language}`;
const listed = (t: MetaTemplate): boolean => components(t.components).length > 0;

/**
 * crm_template_copies (migration 20261107001000): each CRM template's own header, body, footer and
 * buttons, as the crm line's template list last showed them. The API's service role only.
 */
@Injectable()
export class CrmCopiesRepo {
  private copy: CopyEntry | null = null;

  constructor(@Inject(DB) private readonly db: Db) {}

  /** The CRM template's components; null = never listed with its text. One read a minute. */
  async find(name: string, language: string, now = Date.now()): Promise<Component[] | null> {
    const fresh = this.copy && now - this.copy.at < COPY_MS ? this.copy : null;
    const copy = fresh ?? { at: now, rows: this.all() };
    this.copy = copy;
    // A failed read is not kept: the next call reads again (as TemplateNames.rows does).
    copy.rows.catch(() => this.forget(copy));
    const rows = await copy.rows.catch(() => new Map<string, Component[]>());
    return rows.get(keyOf(name, language)) ?? null;
  }

  /** Upserts every listed template that carries its text; returns how many were saved. */
  async save(list: readonly MetaTemplate[], now: Date): Promise<number> {
    const rows = list.filter(listed).map((t) => ({
      name: t.name,
      language: t.language,
      components: components(t.components),
      synced_at: now.toISOString(),
    }));
    if (!rows.length) return 0;
    const { error } = await this.db.from(TABLE).upsert(rows, { onConflict: 'name,language' });
    if (error) throw new Error(`crm template copies not saved: ${error.message}`);
    this.copy = null;
    return rows.length;
  }

  private forget(copy: CopyEntry): void {
    if (this.copy === copy) this.copy = null;
  }

  private async all(): Promise<Copies> {
    const { data, error } = await this.db.from(TABLE).select('name, language, components');
    if (error) throw new Error(error.message);
    const rows = z.array(rowSchema).parse(data);
    return new Map(rows.map((r) => [keyOf(r.name, r.language), components(r.components)]));
  }
}
