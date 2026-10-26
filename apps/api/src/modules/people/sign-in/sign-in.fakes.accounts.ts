import type { CodeSession, PasswordSession } from '@ab/shared';
import { ConflictException } from '@nestjs/common';
import type { AuthGate, GuardianRec, NewProfile, ProfileRec, StudentRec, SubjectStore } from './sign-in.ports';

// Example people only (no real data): one family with an adult contact and a child, staff with phones.

export const PHONES = { guardian: '+966500000001', teacher: '+966500000002', admin: '+966500000003', other: '+966500000009' };

export class FakeSubjects implements SubjectStore {
  guardians: GuardianRec[] = [{ id: 'g1', name: 'ولي الأمر', phone: PHONES.guardian, tz: 'Asia/Riyadh', profileId: null }];
  students: (StudentRec & { code: string })[] = [
    { id: 's1', code: 'AB-1234', name: 'الطالب', tz: 'Asia/Riyadh', profileId: null, guardianPhone: PHONES.guardian },
  ];
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
  async profileByPhone(phone: string) {
    return this.profiles.find((p) => p.phone === phone) ?? null;
  }
  async insertProfile(row: NewProfile): Promise<void> {
    if (row.phone && this.profiles.some((p) => p.phone === row.phone)) throw new ConflictException({ code: 'phone_belongs_to_staff' });
    this.profiles.push({ id: row.id, role: row.role, disabled: false, phone: row.phone, fullName: row.fullName });
  }
  async link(input: { kind: 'guardian' | 'student'; recordId: string; profileId: string }): Promise<boolean> {
    const list: { id: string; profileId: string | null }[] = input.kind === 'guardian' ? this.guardians : this.students;
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
