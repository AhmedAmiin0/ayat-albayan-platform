import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

/** «إنهاء الحلقة للجميع»: lessons.room_ended_at (migration 20261117000100; service role). */
@Injectable()
export class LessonEndRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Stamps the lesson once (a second end keeps the first time) and answers the stamp. */
  async stamp(lessonId: string, at: string): Promise<string> {
    const set = await this.db
      .from('lessons')
      .update({ room_ended_at: at })
      .eq('id', lessonId)
      .is('room_ended_at', null);
    if (set.error) throw dbError(set.error);
    const { data, error } = await this.db
      .from('lessons')
      .select('room_ended_at')
      .eq('id', lessonId)
      .single();
    if (error) throw dbError(error);
    return data.room_ended_at ?? at;
  }
}
