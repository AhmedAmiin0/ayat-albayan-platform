import type { LessonRoomState } from '@ab/schedule';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RoomInsideRepo } from './room-inside.repo';
import { roomStateOf, type Named } from './room-state.mapper';

/** What a lesson payload gives: its times and the room_ended_at stamp. */
export interface RoomLesson {
  id: string;
  starts_at: string;
  ends_at: string;
  room_ended_at?: string | null;
}

/** The `room` of each lesson by id (LessonRoomStates.of). */
export type RoomStates = ReadonlyMap<string, LessonRoomState | null>;

/** A payload with its live room, only where there is one (absent otherwise, as before). */
export function withRoom<T extends { id: string; room?: LessonRoomState | null }>(
  item: T,
  rooms: RoomStates,
): T {
  const room = rooms.get(item.id);
  return room ? { ...item, room } : item;
}

const HOUR_MS = 3_600_000;
/** Only lessons whose room may be open around now are looked up (the window: 15 min / 2 h). */
const BEFORE_MS = 2 * HOUR_MS;
const AFTER_MS = 4 * HOUR_MS;

const nearNow = (l: RoomLesson, now: number): boolean =>
  Date.parse(l.starts_at) - BEFORE_MS <= now && now <= Date.parse(l.ends_at) + AFTER_MS;

/** A hint only: a failed presence read gives no live state, never an error on the schedule. */
@Injectable()
export class LessonRoomStates {
  private readonly log = new Logger(LessonRoomStates.name);

  constructor(@Inject(RoomInsideRepo) private readonly presence: RoomInsideRepo) {}

  /** `named`: whom the viewer may know by name (familyNamed for a family; staff: everyone). */
  async of(
    lessons: readonly RoomLesson[],
    now: Date,
    named?: Named,
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
        ...(named && { named }),
      });
    return new Map(lessons.map((l) => [l.id, stateOf(l)]));
  }
}
