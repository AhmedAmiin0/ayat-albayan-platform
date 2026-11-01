import type { TeacherMe } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { withMeeting } from '@/modules/people/teachers/meeting-view';
import { dbError } from '@/common/http/http';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';

type MyStudent = TeacherMe['students'][number];
const STUDENT = 'id, code, name, tz, status' as const;

/** GET /teachers/me data (R-TCH-03): the teacher's own row and students. */
@Injectable()
export class TeacherMeRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: LessonsSettings,
  ) {}

  /**
   * null when the signed-in profile has no teachers row (→ 404 teacher_not_linked). meeting_mode and
   * platform_classroom (migration 490) tell the dashboard whether to show the fixed link.
   */
  async me(profileId: string): Promise<TeacherMe | null> {
    const { data, error } = await this.db
      .from('teachers')
      .select('id, display_name_ar, gender, programs, tz, meeting_link, meeting_mode')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    const auto = (await this.settings.read()).meeting_link_auto;
    return { ...withMeeting(data, auto), students: await this.students(data.id) };
  }

  /**
   * Distinct union of students assigned to me and students of my active rules, by name. Also the
   * teacher-mode inbox: which of a guardian's children the teacher sees.
   */
  async students(teacherId: string): Promise<MyStudent[]> {
    const [assigned, rules] = await Promise.all([
      this.db.from('students').select(STUDENT).eq('teacher_id', teacherId),
      this.db
        .from('schedule_rules')
        .select(`schedule_rule_students(student:students(${STUDENT}))` as const)
        .eq('teacher_id', teacherId)
        .eq('status', 'active'),
    ]);
    if (assigned.error) throw dbError(assigned.error);
    if (rules.error) throw dbError(rules.error);
    const onRules = rules.data.flatMap((r) => r.schedule_rule_students.map((s) => s.student));
    const byId = new Map<string, MyStudent>();
    for (const s of [...assigned.data, ...onRules]) if (s) byId.set(s.id, { ...s, code: s.code ?? '' });
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }
}
