import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { ImportRow } from './template-import';
import type { TemplatePatch } from './template-sync';
import type { TemplateRow } from './whatsapp.types';

/** message_templates (R-MSG-01): the API is its only writer (health sync and import, submit, starter flag). */
@Injectable()
export class TemplatesQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async all(): Promise<TemplateRow[]> {
    const { data, error } = await this.db.from('message_templates').select('*').order('key');
    if (error) throw new Error(`templates read failed: ${error.message}`);
    return data;
  }

  async get(key: string): Promise<TemplateRow | null> {
    const { data, error } = await this.db.from('message_templates').select('*').eq('key', key).maybeSingle();
    if (error) throw new Error(`template read failed: ${error.message}`);
    return data;
  }

  async update(key: string, patch: TemplatePatch): Promise<TemplateRow | null> {
    const { data, error } = await this.db
      .from('message_templates')
      .update(patch)
      .eq('key', key)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(`template update failed: ${error.message}`);
    return data;
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
    if (error) throw new Error(`template insert failed: ${error.message}`);
    return data;
  }
}
