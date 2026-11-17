import type { LessonRoomState } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RoomInsideRepo } from './room-inside.repo';
import { roomStateOf } from './room-state.mapper';

/** What a lesson payload gives: its times and the «إنهاء الحلقة للجميع» stamp. */
export interface RoomLesson {
  id: string;
  starts_at: string;
  ends_at: string;
  room_ended_at?: string | null;
}

const HOUR_MS = 3_600_000;
/** Only lessons whose room may be open around now are looked up (the window: 15 min / 2 h). */
const BEFORE_MS = 2 * HOUR_MS;
const AFTER_MS = 4 * HOUR_MS;

const nearNow = (l: RoomLesson, now: number): boolean =>
  Date.parse(l.starts_at) - BEFORE_MS <= now && now <= Date.parse(l.ends_at) + AFTER_MS;

/**
 * The `room` of each lesson on the staff rows and the portal (owner 2026-11-16, «الحلقة جارية
 * الآن»): one read of who is inside the lessons near now. A hint: a failed read gives no live
 * state, never an error on the schedule.
 */
@Injectable()
export class LessonRoomStates {
  private readonly log = new Logger(LessonRoomStates.name);

  constructor(@Inject(RoomInsideRepo) private readonly presence: RoomInsideRepo) {}

  async of(
    lessons: readonly RoomLesson[],
    now: Date,
  ): Promise<Map<string, LessonRoomState | null>> {
    const near = lessons.filter((l) => nearNow(l, now.getTime())).map((l) => l.id);
    const inside = await this.presence.inside(near).catch((e: unknown) => {
      this.log.warn(`room presence read failed: ${String(e)}`);
      return [];
    });
    const stateOf = (l: RoomLesson) =>
      roomStateOf({
        endedAt: l.room_ended_at ?? null,
        inside: inside.filter((r) => r.lesson_id === l.id),
      });
    return new Map(lessons.map((l) => [l.id, stateOf(l)]));
  }
}
