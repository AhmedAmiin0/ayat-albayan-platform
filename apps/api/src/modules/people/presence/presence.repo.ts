import type { UserRole } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

function check(error: { message: string } | null, what: string): asserts error is null {
  if (error) throw new Error(`${what} failed: ${error.message}`);
}

/** Someone in a student channel: a current teacher, the guardian login, a self-contact student. */
export interface ChannelPerson {
  profile_id: string;
  role: UserRole;
}

export interface StaffRow {
  id: string;
  full_name: string;
  role: UserRole;
}

const STAFF_ROLES = ['admin', 'teacher', 'assistant', 'sales'] as const;

/** profile_presence (migration 985, API only) and the people a presence answer may name. */
@Injectable()
export class PresenceRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The batched write; the SQL skips a user whose stored time is under a minute old. */
  async touch(profileIds: readonly string[]): Promise<void> {
    if (profileIds.length === 0) return;
    const { error } = await this.db.rpc('presence_touch', { p_profiles: [...profileIds] });
    check(error, 'last seen write');
  }

  async lastSeen(profileIds: readonly string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (profileIds.length === 0) return out;
    const { data, error } = await this.db
      .from('profile_presence')
      .select('profile_id, last_seen_at')
      .in('profile_id', [...profileIds]);
    check(error, 'last seen read');
    for (const r of data) out.set(r.profile_id, r.last_seen_at);
    return out;
  }

  /** People of the channel with a login: its teachers, the guardian, an own-contact student. */
  async channelPeople(studentId: string): Promise<ChannelPerson[]> {
    const [teachers, family] = await Promise.all([
      this.teacherPeople(studentId),
      this.familyPeople(studentId),
    ]);
    return [...teachers, ...family];
  }

  /** Every active staff login (the admin's staff list). */
  async staff(): Promise<StaffRow[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, full_name, role')
      .in('role', [...STAFF_ROLES])
      .is('disabled_at', null)
      .order('full_name');
    check(error, 'staff read');
    return data;
  }

  private async teacherPeople(studentId: string): Promise<ChannelPerson[]> {
    const ids = await this.db.rpc('channel_teacher_ids', { p_student_id: studentId });
    check(ids.error, 'channel teachers read');
    const teacherIds = ids.data;
    if (teacherIds.length === 0) return [];
    const { data, error } = await this.db
      .from('teachers')
      .select('profile_id')
      .in('id', teacherIds);
    check(error, 'channel teacher profiles read');
    return data.flatMap((t) =>
      t.profile_id ? [{ profile_id: t.profile_id, role: 'teacher' as const }] : [],
    );
  }

  private async familyPeople(studentId: string): Promise<ChannelPerson[]> {
    const { data: s, error } = await this.db
      .from('students')
      .select('guardian_id, profile_id, contact_is_self')
      .eq('id', studentId)
      .maybeSingle();
    check(error, 'channel student read');
    if (!s) return [];
    const self: ChannelPerson[] =
      s.profile_id && s.contact_is_self ? [{ profile_id: s.profile_id, role: 'student' }] : [];
    if (!s.guardian_id) return self;
    const g = await this.db
      .from('guardians')
      .select('profile_id')
      .eq('id', s.guardian_id)
      .maybeSingle();
    check(g.error, 'channel guardian read');
    const guardian = g.data?.profile_id;
    return guardian ? [{ profile_id: guardian, role: 'guardian' }, ...self] : self;
  }
}
