import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { rows } from '@/common/db/errors';
import { principalColumns, type Principal } from './moderation.repo';
import { personLinkIds, type LessonStudentRow, type LinkRow } from './room-person.mapper';

const LIMIT = 50;

type Column = 'join_link_id' | 'user_id';

/** The link ids, or the login ids, among these principals. */
const idsOf = (principals: readonly Principal[], column: Column): string[] =>
  principals.flatMap((p) => principalColumns(p)[column] ?? []);

/** Removal keeps a person out, not one row: all their links and identities. */
@Injectable()
export class RoomPersonRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The principals to block: the person's every link row of the lesson, or the login. */
  async principalsOf(lessonId: string, principal: Principal): Promise<Principal[]> {
    const linkId = principalColumns(principal).join_link_id;
    if (!linkId) return [principal];
    const [links, students] = await Promise.all([this.links(lessonId), this.students(lessonId)]);
    return personLinkIds(linkId, { links, students }).map((joinLinkId) => ({ joinLinkId }));
  }

  /** Every identity those principals were admitted with in this lesson and not seen leaving. */
  async identitiesOf(lessonId: string, principals: readonly Principal[]): Promise<string[]> {
    const links = idsOf(principals, 'join_link_id');
    const users = idsOf(principals, 'user_id');
    const or = [
      ...(links.length ? [`join_link_id.in.(${links.join(',')})`] : []),
      ...(users.length ? [`user_id.in.(${users.join(',')})`] : []),
    ];
    if (or.length === 0) return [];
    const data = rows(await this.db
      .from('classroom_participants')
      .select('identity')
      .eq('lesson_id', lessonId)
      .is('left_at', null)
      .or(or.join(','))
      .limit(LIMIT));
    return data.map((r) => r.identity);
  }

  private async links(lessonId: string): Promise<LinkRow[]> {
    const data = rows(await this.db
      .from('lesson_join_links')
      .select('id, student_id, sent_for_student_id')
      .eq('lesson_id', lessonId));
    return data;
  }

  private async students(lessonId: string): Promise<LessonStudentRow[]> {
    const data = rows(await this.db
      .from('lesson_students')
      .select('student_id, student:students(guardian_id)')
      .eq('lesson_id', lessonId));
    return data.map((r) => ({ student_id: r.student_id, guardian_id: r.student.guardian_id }));
  }
}
