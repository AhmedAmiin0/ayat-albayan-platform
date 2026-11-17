import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { principalColumns, type Principal } from './moderation.repo';

const LIMIT = 50;

type Column = 'join_link_id' | 'user_id';

/** The link ids, or the login ids, among these principals. */
const idsOf = (principals: readonly Principal[], column: Column): string[] =>
  principals.flatMap((p) => principalColumns(p)[column] ?? []);

/**
 * «إخراج» keeps a PERSON out, not one row (owner 2026-11-16, room server bugs): every guest link of
 * theirs in this lesson and every LiveKit identity (window) they hold now. A guest's links: in a
 * lesson with one student, every link of the lesson is that student's family's (the WhatsApp ones
 * carry no student); in a group lesson, the rows of the same student. A staff login is itself.
 */
@Injectable()
export class RoomPersonRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The principals to block: the person's every link row of the lesson, or the login. */
  async principalsOf(lessonId: string, principal: Principal): Promise<Principal[]> {
    const linkId = principalColumns(principal).join_link_id;
    if (!linkId) return [principal];
    const [links, students] = await Promise.all([
      this.links(lessonId),
      this.studentCount(lessonId),
    ]);
    const own = links.find((l) => l.id === linkId)?.student_id ?? null;
    const samePerson = (l: { student_id: string | null }) =>
      students <= 1 || (own !== null && l.student_id === own);
    const ids = new Set([linkId, ...links.filter(samePerson).map((l) => l.id)]);
    return [...ids].map((joinLinkId) => ({ joinLinkId }));
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
    const { data, error } = await this.db
      .from('classroom_participants')
      .select('identity')
      .eq('lesson_id', lessonId)
      .is('left_at', null)
      .or(or.join(','))
      .limit(LIMIT);
    if (error) throw dbError(error);
    return data.map((r) => r.identity);
  }

  private async links(lessonId: string): Promise<{ id: string; student_id: string | null }[]> {
    const { data, error } = await this.db
      .from('lesson_join_links')
      .select('id, student_id')
      .eq('lesson_id', lessonId);
    if (error) throw dbError(error);
    return data;
  }

  private async studentCount(lessonId: string): Promise<number> {
    const { count, error } = await this.db
      .from('lesson_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('lesson_id', lessonId);
    if (error) throw dbError(error);
    return count ?? 0;
  }
}
