import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { done, maybe, pgError } from '@/common/db/errors';

type ParticipantRow = Tables<'classroom_participants'>;

/** One webhook's participant: the lesson of its room, the LiveKit identity, the event's time. */
export interface PresenceEvent {
  lessonId: string;
  identity: string;
  at: string;
}

/** Only an event newer than the last one the row applied (presence_at, migration 150). */
const olderThan = (at: string): string => `presence_at.is.null,presence_at.lt.${at}`;

/**
 * Who is inside a lesson room now (migrations 20261117100110 / 150, on classroom_participants):
 * LiveKit's participant_joined / participant_left stamp the admitted identity's row in LiveKit's
 * order (an older or retried event changes nothing); the lessons module's RoomInsideRepo reads them
 * for the lesson payloads. Service role only.
 */
@Injectable()
export class RoomPresenceRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** participant_joined: inside now; entered_at keeps the first arrival. null: unknown or stale. */
  async entered(e: PresenceEvent): Promise<Pick<ParticipantRow, 'role'> | null> {
    const match = { lesson_id: e.lessonId, identity: e.identity };
    const rows = () => this.db.from('classroom_participants');
    const data = maybe(
      await rows()
        .update({ left_at: null, presence_at: e.at })
        .match(match)
        .or(olderThan(e.at))
        .select('role')
        .maybeSingle(),
    );
    if (!data) return null;
    const first = await rows().update({ entered_at: e.at }).match(match).is('entered_at', null);
    if (first.error) throw pgError(first.error);
    return data;
  }

  /** participant_left: no longer inside (unless a newer join already came). */
  async left(e: PresenceEvent): Promise<void> {
    const match = { lesson_id: e.lessonId, identity: e.identity };
    done(
      await this.db
        .from('classroom_participants')
        .update({ left_at: e.at, presence_at: e.at })
        .match(match)
        .or(olderThan(e.at)),
    );
  }

  /** Ending the room or room_finished: everyone inside is out; no more events follow. */
  async leaveAll(lessonId: string, at: string): Promise<void> {
    done(
      await this.db
        .from('classroom_participants')
        .update({ left_at: at, presence_at: at })
        .eq('lesson_id', lessonId)
        .not('entered_at', 'is', null)
        .is('left_at', null),
    );
  }

  /** Is anyone inside this lesson's room now? */
  async anyInside(lessonId: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('classroom_participants')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', lessonId)
      .not('entered_at', 'is', null)
      .is('left_at', null);
    if (error) throw pgError(error);
    return (count ?? 0) > 0;
  }
}
