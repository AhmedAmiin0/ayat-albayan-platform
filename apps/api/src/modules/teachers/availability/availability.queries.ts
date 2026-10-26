import type { Tables } from '@ab/db';
import { OCCUPYING_LESSON_STATUSES, RIYADH_TZ, type AvailabilitySlot, type TimeOffCreate } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import type { BusyLesson } from '../../scheduling/conflicts/conflicts';
import { dbError } from '../../../common/http/http';
import { TeachersSettings } from '../teachers.settings';
import { allDayRows, type WeeklyRow } from './free-slots';

export type AvailabilityRow = AvailabilitySlot & { id: string };
export type TimeOff = Tables<'teacher_time_off'>;
type Owned = { teacherId: string; actorId: string };

/** Postgres `time` comes back as "HH:MM:SS"; the API speaks "HH:MM" like the input schema. */
const hhmm = (time: string) => time.slice(0, 5);

/** Supabase access for teacher_availability + teacher_time_off. R-TCH-02. */
@Injectable()
export class AvailabilityQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: TeachersSettings,
  ) {}

  /**
   * The grid booking checks against: every day 00:00–24:00 Riyadh (the clock the slot grid shows)
   * while settings.teachers_always_available is on, else the saved rows. The editors and the
   * follow-up proposals read listSlots, so they keep the real grid.
   */
  async bookableSlots(teacherId: string): Promise<WeeklyRow[]> {
    if ((await this.settings.read()).teachers_always_available) return allDayRows(RIYADH_TZ);
    return this.listSlots(teacherId);
  }

  async listSlots(teacherId: string): Promise<AvailabilityRow[]> {
    const { data, error } = await this.db
      .from('teacher_availability')
      .select('id, weekday, start_time, end_time, tz')
      .eq('teacher_id', teacherId)
      .order('weekday')
      .order('start_time');
    if (error) throw dbError(error);
    return data.map((r) => ({ ...r, start_time: hhmm(r.start_time), end_time: hhmm(r.end_time) }));
  }

  /**
   * Replaces the teacher's whole weekly grid.
   * ponytail: insert-new-then-delete-old, not one transaction (supabase-js has none). A failed
   * delete leaves extra rows (freeSlots merges overlaps), never an empty grid. Upgrade: an RPC.
   */
  async replaceSlots(opts: Owned & { slots: AvailabilitySlot[] }): Promise<AvailabilityRow[]> {
    let keep: string[] = [];
    if (opts.slots.length > 0) {
      const rows = opts.slots.map((s) => ({ ...s, teacher_id: opts.teacherId, created_by: opts.actorId }));
      const { data, error } = await this.db.from('teacher_availability').insert(rows).select('id');
      if (error) throw dbError(error);
      keep = data.map((r) => r.id);
    }
    let stale = this.db.from('teacher_availability').delete().eq('teacher_id', opts.teacherId);
    if (keep.length > 0) stale = stale.not('id', 'in', `(${keep.join(',')})`);
    const { error } = await stale;
    if (error) throw dbError(error);
    return this.listSlots(opts.teacherId);
  }

  /** Newest first. ponytail: unpaginated — a teacher has a handful; page it if that changes. */
  async listTimeOff(teacherId: string, range?: { from: Date; to: Date }): Promise<TimeOff[]> {
    let query = this.db.from('teacher_time_off').select('*').eq('teacher_id', teacherId);
    if (range) {
      query = query.lt('starts_at', range.to.toISOString()).gt('ends_at', range.from.toISOString());
    }
    const { data, error } = await query.order('starts_at', { ascending: false });
    if (error) throw dbError(error);
    return data;
  }

  /** The teacher's occupying lessons overlapping `range` (R-SCH-04): what a new booking can't hit. */
  async listBusyLessons(teacherId: string, range: { from: Date; to: Date }): Promise<BusyLesson[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, starts_at, ends_at')
      .eq('teacher_id', teacherId)
      .in('status', OCCUPYING_LESSON_STATUSES)
      .lt('starts_at', range.to.toISOString())
      .gt('ends_at', range.from.toISOString());
    if (error) throw dbError(error);
    return data.map((l) => ({ id: l.id, starts_at: new Date(l.starts_at), ends_at: new Date(l.ends_at) }));
  }

  async insertTimeOff(opts: Owned & { body: TimeOffCreate }): Promise<TimeOff> {
    const row = { ...opts.body, teacher_id: opts.teacherId, created_by: opts.actorId };
    const { data, error } = await this.db.from('teacher_time_off').insert(row).select('*').single();
    if (error) throw dbError(error);
    return data;
  }

  async updateTimeOff(opts: { teacherId: string; id: string; body: TimeOffCreate }): Promise<TimeOff | null> {
    const { data, error } = await this.db
      .from('teacher_time_off')
      .update(opts.body)
      .eq('id', opts.id)
      .eq('teacher_id', opts.teacherId)
      .select('*')
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** false when no row of this teacher matched. */
  async deleteTimeOff(teacherId: string, id: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('teacher_time_off')
      .delete()
      .eq('id', id)
      .eq('teacher_id', teacherId)
      .select('id');
    if (error) throw dbError(error);
    return data.length > 0;
  }
}
