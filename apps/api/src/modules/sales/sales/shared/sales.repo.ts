import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { readChunked } from '@/common/db/read-all';
import { isSalesLesson, salesLessonsBetween, type SalesLessonRow } from '@/modules/sales/sales/schedule/sales-lessons';
import { ownershipOf, type SalesOwnership } from '@/modules/sales/sales/sales-ownership';

/** The columns a salesperson may see of a subscription: never money (price, fx_*, notes). */
export type SalesSubscriptionRow = Pick<Tables<'subscriptions'>, 'id' | 'package' | 'status' | 'starts_on' | 'lessons_total'> & {
  student: { id: string; code: string | null; name: string } | null;
};

const newestStartFirst = (a: SalesSubscriptionRow, b: SalesSubscriptionRow): number =>
  b.starts_on.localeCompare(a.starts_on);

/** Sales portal reads (service role; SalesService and SalesScopes scope every call, rule 9). */
@Injectable()
export class SalesRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  ownership(profileId: string): Promise<SalesOwnership> {
    return ownershipOf(this.db, profileId);
  }

  async subscriptions(input: { studentIds: readonly string[]; statuses: readonly Tables<'subscriptions'>['status'][] }): Promise<SalesSubscriptionRow[]> {
    const data = await readChunked(input.studentIds, (chunk) => this.db
      .from('subscriptions')
      .select('id, package, status, starts_on, lessons_total, student:students(id, code, name)')
      .in('student_id', chunk)
      .in('status', [...input.statuses])
      .order('starts_on', { ascending: false }));
    return data.toSorted(newestStartFirst);
  }

  meetings(input: { own: SalesOwnership; from: string; to: string }): Promise<SalesLessonRow[]> {
    return salesLessonsBetween(this.db, input);
  }

  /** Room join and template sends: is this lesson in the profile's scope? */
  ownsLesson(profileId: string, lessonId: string): Promise<boolean> {
    return isSalesLesson(this.db, { profileId, lessonId });
  }
}
