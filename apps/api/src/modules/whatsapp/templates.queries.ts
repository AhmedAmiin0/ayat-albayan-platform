import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { TemplatePatch } from './template-sync';
import type { TemplateRow } from './whatsapp.types';

/** message_templates (R-MSG-01): the API is its only writer (health sync, explicit submit). */
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
}
