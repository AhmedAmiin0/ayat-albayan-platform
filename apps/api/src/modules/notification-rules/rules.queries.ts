import { NOTIFICATION_CATALOGUE, type LineHealthView, type TemplateStatus, type WaLine } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { LineHealthStore } from '../whatsapp/line-health.store';

export type TemplateFacts = ReadonlyMap<string, { status: TemplateStatus; line: WaLine }>;

/** Every template key a catalogue row may send. */
export const CATALOGUE_TEMPLATE_KEYS: readonly string[] = [...new Set(NOTIFICATION_CATALOGUE.flatMap((e) => [...e.templates]))];

/** What the catalogue reads: message_templates (approval and number per key) and the kept line checks. */
@Injectable()
export class RulesQueries {
  private readonly log = new Logger(RulesQueries.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly health: LineHealthStore,
  ) {}

  /**
   * The last good number per line (no Meta call). A failed read (e.g. the table not migrated yet)
   * shows «not checked yet» instead of failing the whole list.
   */
  async lines(): Promise<LineHealthView[]> {
    try {
      return await this.health.all();
    } catch (e) {
      this.log.warn(`line health unread: ${e instanceof Error ? e.message : String(e)}`);
      return [];
    }
  }

  async templates(): Promise<TemplateFacts> {
    const { data, error } = await this.db.from('message_templates').select('key, status, line').in('key', [...CATALOGUE_TEMPLATE_KEYS]);
    if (error) throw new Error(`templates read failed: ${error.message}`);
    return new Map(data.map((r) => [r.key, { status: r.status, line: r.line }]));
  }
}
