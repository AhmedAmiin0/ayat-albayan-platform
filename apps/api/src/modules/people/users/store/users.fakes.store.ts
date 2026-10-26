import type { LinkCandidate, LinkKind } from '@ab/shared';
import { conflict } from '../../../../common/http/errors';
import type { LinkTarget, NewProfile, NewTeacher, ProfilePatch, RefRow, StaffProfile, UserRow, UserStore } from './users.store';

export const row = (id: string, role: UserRow['role'], extra: Partial<UserRow> = {}): UserRow => ({
  id,
  email: `${id}@example.com`,
  full_name: `User ${id}`,
  phone_e164: null,
  role,
  role_id: null,
  role_key: role,
  disabled_at: null,
  last_sign_in_at: null,
  created_at: '2026-10-06T00:00:00Z',
  linked: null,
  ...extra,
});

export interface Link {
  kind: LinkKind;
  id: string;
  name: string;
  code: string | null;
  profile_id: string | null;
}

/**
 * In-memory UserStore: profiles by id, link rows, references per user. `phone_e164` is unique like in
 * the database; `guardLost` makes the guarded writes fail the way migration 287 does when the API's
 * own last-admin check lost a race.
 */
export class FakeUserStore implements UserStore {
  teachers: NewTeacher[] = [];
  synced: { profileId: string; patch: object }[] = [];
  refs: Record<string, RefRow[]> = {};
  /** Phones of teacher records that belong to nobody in `rows`. */
  otherTeacherPhones: string[] = [];
  failLink = false;
  guardLost = false;
  /** Profiles whose browser push subscriptions were deleted. */
  browsersForgotten: string[] = [];

  constructor(
    public rows: UserRow[] = [],
    public links: Link[] = [],
  ) {}

  async list() {
    return { rows: this.rows, total: this.rows.length };
  }

  async get(id: string) {
    const r = this.rows.find((x) => x.id === id);
    if (!r) return null;
    const l = this.links.find((x) => x.profile_id === id);
    return { ...r, linked: l ? { kind: l.kind, id: l.id, name: l.name, code: l.code } : null };
  }

  async staff(): Promise<StaffProfile[]> {
    return this.rows.filter((r) => r.role !== 'guardian' && r.role !== 'student').map((r) => this.prof(r));
  }

  async profile(id: string) {
    const r = this.rows.find((x) => x.id === id);
    return r ? this.prof(r) : null;
  }

  async upsertProfile(p: NewProfile) {
    const next = row(p.id, p.role, { ...p, email: `${p.id}@example.com` });
    this.rows = [...this.rows.filter((r) => r.id !== p.id), next];
  }

  async updateProfile(id: string, patch: ProfilePatch) {
    if (patch.phone_e164 && (await this.phoneTaken(patch.phone_e164, id))) throw conflict('phone_taken');
    if (this.guardLost && (patch.role !== undefined || patch.role_id !== undefined)) throw conflict('last_admin');
    this.rows = this.rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
  }

  async setDisabled(id: string, value: { by: string; reason: string | null } | null) {
    if (this.guardLost && value) throw conflict('last_admin');
    this.rows = this.rows.map((r) => (r.id === id ? { ...r, disabled_at: value ? 'now' : null, disabled_reason: value?.reason ?? null } : r));
  }

  async forgetBrowsers(id: string) {
    this.browsersForgotten.push(id);
  }

  async phoneTaken(phone: string, exceptProfile: string) {
    return this.rows.some((r) => r.phone_e164 === phone && r.id !== exceptProfile) || this.otherTeacherPhones.includes(phone);
  }

  async linkTarget(kind: LinkKind, id: string): Promise<LinkTarget | null> {
    const l = this.links.find((x) => x.kind === kind && x.id === id);
    return l ? { id, name: l.name, hasLogin: l.profile_id !== null } : null;
  }

  async link(kind: LinkKind, id: string, profileId: string) {
    const l = this.links.find((x) => x.kind === kind && x.id === id);
    if (!l || l.profile_id || this.failLink) return false;
    l.profile_id = profileId;
    return true;
  }

  async createTeacher(t: NewTeacher) {
    this.teachers.push(t);
    this.links.push({ kind: 'teacher', id: `t-${this.teachers.length}`, name: t.display_name_ar, code: null, profile_id: t.profile_id });
    return `t-${this.teachers.length}`;
  }

  async syncTeacher(profileId: string, patch: object) {
    this.synced.push({ profileId, patch });
  }

  async candidates(kind: LinkKind): Promise<LinkCandidate[]> {
    return this.links.filter((l) => l.kind === kind && !l.profile_id).map((l) => ({ kind, id: l.id, name: l.name, code: l.code }));
  }

  async references(id: string) {
    return this.refs[id] ?? [];
  }

  private prof(r: UserRow): StaffProfile {
    return { id: r.id, full_name: r.full_name, role: r.role, role_id: r.role_id, disabled_at: r.disabled_at };
  }
}
