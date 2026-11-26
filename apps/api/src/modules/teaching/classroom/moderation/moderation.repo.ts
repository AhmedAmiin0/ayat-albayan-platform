import type { Tables, TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { DB, type Db } from '@/common/db/db.module';
import { done, isUniqueViolation, maybe, pgError, rows } from '@/common/db/errors';

export type ParticipantRow = Tables<'classroom_participants'>;

/** Who is (or was) let in: a staff login, or the guest link a family came by. */
export type Principal = { userId: string } | { joinLinkId: string };


/** classroom_participants / classroom_blocks columns of a principal. */
export const principalColumns = (p: Principal): { user_id: string | null; join_link_id: string | null } =>
  'userId' in p ? { user_id: p.userId, join_link_id: null } : { user_id: null, join_link_id: p.joinLinkId };

/** The principal of a participant row; null when its login or link is gone. */
export function principalOf(row: Pick<ParticipantRow, 'user_id' | 'join_link_id'>): Principal | null {
  if (row.join_link_id) return { joinLinkId: row.join_link_id };
  return row.user_id ? { userId: row.user_id } : null;
}

interface BlockInput {
  lessonId: string;
  principal: Principal;
  /** The remover (admin or the lesson's teacher). */
  blockedBy: string;
  /** The removed participant, for the audit trail. */
  target: Pick<ParticipantRow, 'identity' | 'role' | 'name'>;
}

/** Joins and removals of the classroom (service role; the services guard). */
@Injectable()
export class ModerationRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async addParticipant(row: TablesInsert<'classroom_participants'>): Promise<void> {
    done(await this.db.from('classroom_participants').insert(row));
  }

  /** A trial lesson (its rule's package is 'trial'): the room has no text chat. */
  async isTrialLesson(lessonId: string): Promise<boolean> {
    const data = maybe(await this.db
      .from('lessons')
      .select('rule:schedule_rules!lessons_rule_id_fkey(package)')
      .eq('id', lessonId)
      .maybeSingle());
    return data?.rule?.package === 'trial';
  }

  /** The participant behind an identity, only within this lesson. */
  async participant(lessonId: string, identity: string): Promise<ParticipantRow | null> {
    const data = maybe(await this.db
      .from('classroom_participants')
      .select('*')
      .match({ lesson_id: lessonId, identity })
      .maybeSingle());
    return data;
  }

  async isBlocked(lessonId: string, principal: Principal): Promise<boolean> {
    const cols = principalColumns(principal);
    const column = cols.user_id ? 'user_id' : 'join_link_id';
    const value = cols.user_id ?? cols.join_link_id ?? '';
    const data = rows(await this.db
      .from('classroom_blocks')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq(column, value)
      .limit(1));
    return data.length > 0;
  }

  /**
   * Idempotent: a second removal of the same principal keeps the one block (and is audited again).
   */
  async block(input: BlockInput): Promise<void> {
    const cols = principalColumns(input.principal);
    const { error } = await this.db
      .from('classroom_blocks')
      .insert({ lesson_id: input.lessonId, blocked_by: input.blockedBy, ...cols });
    if (error && !isUniqueViolation(error)) throw pgError(error);
    await this.audit.record({
      actorId: input.blockedBy,
      entity: 'lessons',
      entityId: input.lessonId,
      action: 'participant_removed',
      after: { ...input.target, ...cols },
    });
  }
}
