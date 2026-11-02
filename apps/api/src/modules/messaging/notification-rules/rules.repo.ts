import {
  isWaLine,
  NOTIFICATION_CATALOGUE,
  type LineHealthView,
  type NotificationsOverview,
  type TemplateStatus,
  type WaLine,
} from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { LineHealthStore } from '@/modules/messaging/whatsapp/lines/line-health.store';

type TemplateFacts = ReadonlyMap<string, { status: TemplateStatus; line: WaLine }>;
export type Reach = NonNullable<NotificationsOverview['reach']>;

/** Is the academy classroom in use (LiveKit configured)? Read per call: LIVEKIT_* may come from the DB. */
export const RULES_CLASSROOM = Symbol('RULES_CLASSROOM');
export type ClassroomOn = () => boolean;

/** Every template key a catalogue row may send. */
export const CATALOGUE_TEMPLATE_KEYS: readonly string[] = [...new Set(NOTIFICATION_CATALOGUE.flatMap((e) => [...e.templates]))];

/** What the catalogue reads: message_templates (approval and number per key) and the kept line checks. */
@Injectable()
export class RulesRepo {
  private readonly log = new Logger(RulesRepo.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly health: LineHealthStore,
    @Inject(RULES_CLASSROOM) private readonly classroomOn: ClassroomOn,
  ) {}

  classroom(): boolean {
    return this.classroomOn();
  }

  /** «سيصل إلى N»: guardians, active teachers and leads with a phone. A failed count reads 0 (logged). */
  async reach(): Promise<Reach> {
    const count = async (name: string, run: () => PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
      try {
        const { count: n, error } = await run();
        if (error) throw new Error(error.message);
        return n ?? 0;
      } catch (e) {
        this.log.warn(`reach ${name} uncounted: ${e instanceof Error ? e.message : String(e)}`);
        return 0;
      }
    };
    const head = { count: 'exact', head: true } as const;
    const [guardian, teacher, lead] = await Promise.all([
      count('guardian', () => this.db.from('guardians').select('id', head)),
      count('teacher', () => this.db.from('teachers').select('id', head).eq('status', 'active').not('phone_e164', 'is', null)),
      count('lead', () => this.db.from('leads').select('id', head)),
    ]);
    return { guardian, teacher, lead };
  }

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
    return new Map(
      data.flatMap((r) =>
        isWaLine(r.line) ? [[r.key, { status: r.status, line: r.line }] as const] : [],
      ),
    );
  }
}
