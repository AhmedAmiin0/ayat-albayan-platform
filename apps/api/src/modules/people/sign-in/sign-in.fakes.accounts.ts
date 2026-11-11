import type { CodeSession, PasswordSession } from '@ab/shared';
import { ConflictException } from '@nestjs/common';
import type { AuthGate, GuardianRec, LinkKind, NewProfile, ProfileRec } from './sign-in.ports';
import type { StudentRec, SubjectStore, TeacherRec } from './sign-in.ports';

// Example people only (no real data): one family with an adult contact and a child, staff with phones.

export const PHONES = {
  guardian: '+966500000001',
  teacher: '+966500000002',
  admin: '+966500000003',
  newTeacher: '+966500000005',
  other: '+966500000009',
};

/** A teacher record as the fake keeps it (its login is read from `profiles`). */
type FakeTeacher = Omit<TeacherRec, 'login'> & { active: boolean };

const RIYADH = 'Asia/Riyadh';

export class FakeSubjects implements SubjectStore {
  guardians: GuardianRec[] = [{ id: 'g1', name: 'ولي الأمر', phone: PHONES.guardian, tz: 'Asia/Riyadh', profileId: null }];
  students: (StudentRec & { code: string })[] = [
    { id: 's1', code: 'AB-1234', name: 'الطالب', tz: 'Asia/Riyadh', profileId: null, guardianPhone: PHONES.guardian },
  ];
  /** «omar» has a login (p-teacher); t-new has none yet (docs/46 A2). */
  teachers: FakeTeacher[] = [
    { id: 't-omar', name: 'عمر', tz: RIYADH, recordPhone: PHONES.teacher, profileId: 'p-teacher' },
    { id: 't-new', name: 'المعلمة', tz: RIYADH, recordPhone: PHONES.newTeacher, profileId: null },
  ].map((t) => ({ ...t, active: true }));
  profiles: (ProfileRec & { username?: string | null; fullName?: string })[] = [
    { id: 'p-teacher', role: 'teacher', disabled: false, phone: PHONES.teacher, username: 'omar' },
    { id: 'p-admin', role: 'admin', disabled: false, phone: PHONES.admin },
  ];

  async guardianByPhone(phone: string) {
    return this.guardians.find((g) => g.phone === phone) ?? null;
  }
  async studentByCode(code: string) {
    return this.students.find((s) => s.code === code) ?? null;
  }
  async profileById(id: string) {
    return this.profiles.find((p) => p.id === id) ?? null;
  }
  async profileByUsername(username: string) {
    return this.profiles.find((p) => p.username === username) ?? null;
  }
  async staffByPhone(phone: string) {
    return this.profiles.find((p) => p.phone === phone && p.role !== 'guardian' && p.role !== 'student') ?? null;
  }
  teacherByPhone(phone: string): Promise<TeacherRec | null> {
    return Promise.resolve(this.teacherNow(phone));
  }
  private teacherNow(phone: string): TeacherRec | null {
    const own = this.profiles.find((p) => p.phone === phone && p.role === 'teacher');
    const active = this.teachers.filter((t) => t.active);
    const byLogin = own ? active.find((t) => t.profileId === own.id) : undefined;
    const hit = byLogin ?? active.find((t) => t.recordPhone === phone);
    if (!hit) return null;
    const { active: _active, ...rec } = hit;
    const p = this.profiles.find((x) => x.id === hit.profileId);
    const login = p ? { id: p.id, role: p.role, disabled: p.disabled, phone: p.phone } : null;
    return { ...rec, login };
  }
  async profileByPhone(phone: string) {
    return this.profiles.find((p) => p.phone === phone) ?? null;
  }
  async insertProfile(row: NewProfile): Promise<void> {
    if (row.phone && this.profiles.some((p) => p.phone === row.phone)) throw new ConflictException({ code: 'phone_belongs_to_staff' });
    this.profiles.push({ id: row.id, role: row.role, disabled: false, phone: row.phone, fullName: row.fullName });
  }
  async link(input: { kind: LinkKind; recordId: string; profileId: string }): Promise<boolean> {
    const lists: Record<LinkKind, { id: string; profileId: string | null }[]> = {
      guardian: this.guardians,
      student: this.students,
      teacher: this.teachers,
    };
    const list = lists[input.kind];
    const rec = list.find((r) => r.id === input.recordId);
    if (!rec || rec.profileId) return false;
    rec.profileId = input.profileId;
    return true;
  }
}

interface User {
  id: string;
  email: string;
  password: string | null;
}

export class FakeAuth implements AuthGate {
  users: User[] = [
    { id: 'p-teacher', email: 'teacher@example.com', password: 'Teacher-pass-1' },
    { id: 'p-admin', email: 'admin@example.com', password: 'Admin-pass-1' },
  ];
  revoked: string[] = [];
  links: string[] = [];

  async idByEmail(email: string) {
    return this.users.find((u) => u.email === email.toLowerCase())?.id ?? null;
  }
  async emailOf(id: string) {
    return this.users.find((u) => u.id === id)?.email ?? null;
  }
  async createUser(input: { email: string; password?: string; fullName: string }) {
    const id = `u-${this.users.length + 1}`;
    this.users.push({ id, email: input.email, password: input.password ?? null });
    return id;
  }
  async removeUser(id: string) {
    this.users = this.users.filter((u) => u.id !== id);
  }
  async setPassword(id: string, password: string) {
    const user = this.users.find((u) => u.id === id);
    if (user) user.password = password;
  }
  async revokeSessions(id: string) {
    this.revoked.push(id);
  }
  async magicLink(email: string): Promise<CodeSession> {
    this.links.push(email);
    return { token_hash: `hash-of-${email}`, type: 'magiclink' };
  }
  async signIn(input: { email: string; password: string }): Promise<PasswordSession | null> {
    const user = this.users.find((u) => u.email === input.email && u.password === input.password);
    return user ? { access_token: `at-${user.id}`, refresh_token: `rt-${user.id}`, expires_in: 3600, expires_at: null } : null;
  }
}
