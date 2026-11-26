import { joinWindowConfig, type JoinWindowConfig } from '@ab/schedule';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { one, pgError } from '@/common/db/errors';
import { ClassroomSettings } from '@/modules/teaching/classroom/classroom.settings';

/** lessons.room_ended_at (migration 20261117100100; service role). */
@Injectable()
export class LessonEndRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ClassroomSettings) private readonly settings: ClassroomSettings,
  ) {}

  /** The classroom window from settings (join_opens_before_min / join_closes_after_min, cached). */
  async joinWindow(): Promise<JoinWindowConfig> {
    return joinWindowConfig(await this.settings.read());
  }

  /** Stamps the lesson once (a second end keeps the first time) and answers the stamp. */
  async stamp(lessonId: string, at: string): Promise<string> {
    const set = await this.db
      .from('lessons')
      .update({ room_ended_at: at })
      .eq('id', lessonId)
      .is('room_ended_at', null);
    if (set.error) throw pgError(set.error);
    const data = one(await this.db
      .from('lessons')
      .select('room_ended_at')
      .eq('id', lessonId)
      .single());
    return data.room_ended_at ?? at;
  }
}
