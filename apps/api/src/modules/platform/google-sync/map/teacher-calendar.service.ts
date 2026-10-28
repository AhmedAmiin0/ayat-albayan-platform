import { TEACHER_CALENDAR_OWNERS, type TeacherCalendarOwner, type TeacherCalendarView } from '@ab/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { GoogleRuntime } from '../google-runtime';

const fail = (what: string, error: { message: string }) => new Error(`google ${what} failed: ${error.message}`);
const ownerOf = (v: string): TeacherCalendarOwner => (TEACHER_CALENDAR_OWNERS as readonly string[]).includes(v) ? (v as TeacherCalendarOwner) : 'script';

/**
 * «تقويم المعلم» (docs/24 «نقل تقويم معلم إلى المنصة»): who builds a teacher's Google Calendar. The
 * switch is a plain column write; the DB stamps and audits it and its trigger queues that teacher's
 * lessons (to write when 'platform', to drop our own events when back to 'script').
 */
@Injectable()
export class TeacherCalendarService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly run: GoogleRuntime,
  ) {}

  async view(teacherId: string): Promise<TeacherCalendarView> {
    const [t, c] = await Promise.all([
      this.db.from('teachers').select('id, calendar_owner, calendar_owner_changed_at').eq('id', teacherId).maybeSingle(),
      this.db.rpc('google_teacher_calendar_counts', { p_teacher_id: teacherId }),
    ]);
    if (t.error) throw fail('teacher read', t.error);
    if (c.error) throw fail('teacher counts', c.error);
    if (!t.data) throw new NotFoundException();
    const counts = c.data[0];
    return {
      teacher_id: t.data.id,
      owner: ownerOf(t.data.calendar_owner),
      changed_at: t.data.calendar_owner_changed_at,
      managed: counts?.managed ?? 0,
      script_event_present: counts?.script_event_present ?? 0,
    };
  }

  async setOwner(input: { teacherId: string; owner: TeacherCalendarOwner; actorId: string }): Promise<TeacherCalendarView> {
    const { data, error } = await this.db
      .from('teachers')
      .update({ calendar_owner: input.owner, calendar_owner_changed_by: input.actorId })
      .eq('id', input.teacherId)
      .neq('calendar_owner', input.owner)
      .select('id');
    if (error) throw fail('teacher calendar owner write', error);
    if (data.length === 1) void this.run.job.kick();
    return this.view(input.teacherId);
  }
}
