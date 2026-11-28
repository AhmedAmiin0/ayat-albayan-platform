import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { rows } from '@/common/db/errors';

/** Someone inside a lesson room now: their row, and the student of the guest link they came by. */
export type PresenceRow = Pick<
  Tables<'classroom_participants'>,
  'lesson_id' | 'name' | 'role' | 'entered_at'
> & {
  link: { student_id: string | null } | null;
};

const INSIDE = 'lesson_id, name, role, entered_at, link:lesson_join_links(student_id)';
const LIMIT = 500;

/**
 * Who is inside lesson rooms now (migration 20261117100110): the rows the classroom's LiveKit
 * webhook stamped entered and not left (RoomPresenceRepo writes them). Service role, read only.
 */
@Injectable()
export class RoomInsideRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Everyone inside these lessons' rooms now, earliest arrival first. */
  async inside(lessonIds: readonly string[]): Promise<PresenceRow[]> {
    if (lessonIds.length === 0) return [];
    const data = rows(
      await this.db
        .from('classroom_participants')
        .select(INSIDE)
        .in('lesson_id', [...lessonIds])
        .not('entered_at', 'is', null)
        .is('left_at', null)
        .order('entered_at')
        .limit(LIMIT),
    );
    return data;
  }
}
