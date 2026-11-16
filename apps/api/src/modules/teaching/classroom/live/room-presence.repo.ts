import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

type ParticipantRow = Tables<'classroom_participants'>;

/** One webhook's participant: the lesson of its room, the LiveKit identity, the event's time. */
export interface PresenceEvent {
  lessonId: string;
  identity: string;
  at: string;
}

/**
 * Who is inside a lesson room now (migration 20261117000110, on classroom_participants): LiveKit's
 * participant_joined / participant_left stamp the admitted identity's row (the lessons module's
 * RoomInsideRepo reads them for the lesson payloads). Service role only.
 */
@Injectable()
export class RoomPresenceRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** participant_joined: inside now; entered_at keeps the first arrival. null: not one we admitted. */
  async entered(e: PresenceEvent): Promise<Pick<ParticipantRow, 'role'> | null> {
    const match = { lesson_id: e.lessonId, identity: e.identity };
    const rows = () => this.db.from('classroom_participants');
    const { data, error } = await rows().update({ left_at: null }).match(match).select('role').maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    const first = await rows().update({ entered_at: e.at }).match(match).is('entered_at', null);
    if (first.error) throw dbError(first.error);
    return data;
  }

  /** participant_left: no longer inside. */
  async left(e: PresenceEvent): Promise<void> {
    const match = { lesson_id: e.lessonId, identity: e.identity };
    const { error } = await this.db.from('classroom_participants').update({ left_at: e.at }).match(match);
    if (error) throw dbError(error);
  }

  /** «إنهاء الحلقة للجميع»: everyone inside is out (LiveKit closes the room without more events). */
  async leaveAll(lessonId: string, at: string): Promise<void> {
    const { error } = await this.db
      .from('classroom_participants')
      .update({ left_at: at })
      .eq('lesson_id', lessonId)
      .not('entered_at', 'is', null)
      .is('left_at', null);
    if (error) throw dbError(error);
  }
}
