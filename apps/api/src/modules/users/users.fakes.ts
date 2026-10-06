import { GRANTABLE_PERMISSIONS, type LinkCandidate, type LinkKind } from '@ab/shared';
import { vi } from 'vitest';
import { AuditService } from '../../common/audit/audit.service';
import { PermissionCache } from '../../common/auth/permission.cache';
import { FakeRoleStore } from '../roles/roles.fakes';
import { UserAccess } from './users.access';
import { FakeAuthAdmin } from './users.fakes.auth';
import { UsersCreateService } from './users.create.service';
import { UsersLifecycleService } from './users.lifecycle.service';
import { UserEffects, UserPorts } from './users.ports';
import { UsersService, type Actor } from './users.service';
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

/** In-memory UserStore: profiles by id, link rows, references per user. */
export class FakeUserStore implements UserStore {
  teachers: NewTeacher[] = [];
  synced: { profileId: string; patch: object }[] = [];
  refs: Record<string, RefRow[]> = {};
  failLink = false;

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
    this.rows = this.rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
  }

  async setDisabled(id: string, value: { by: string; reason: string | null } | null) {
    this.rows = this.rows.map((r) => (r.id === id ? { ...r, disabled_at: value ? 'now' : null, disabled_reason: value?.reason ?? null } : r));
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

  async unlink(profileId: string) {
    for (const l of this.links) if (l.profile_id === profileId) l.profile_id = null;
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

/** The system admin: every grantable permission. */
export const ADMIN_ACTOR: Actor = { id: 'admin1', permissions: [...GRANTABLE_PERMISSIONS] };

/** Everything wired with fakes. `rows` should include the acting admin (role admin, system role). */
export function setupUsers(rows: UserRow[] = [row('admin1', 'admin')], links: Link[] = []) {
  const store = new FakeUserStore(rows, links);
  const auth = new FakeAuthAdmin();
  const roles = new FakeRoleStore();
  const cache = new PermissionCache();
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const config = { passwordMinLength: 8, setPasswordUrl: 'https://app.example.test/set-password' };
  const ports = new UserPorts(store, auth, new UserAccess(roles, store));
  const effects = new UserEffects(cache, audit as unknown as AuditService, config);
  return {
    store,
    auth,
    roles,
    cache,
    audit,
    users: new UsersService(ports, effects),
    creator: new UsersCreateService(ports, effects),
    lifecycle: new UsersLifecycleService(ports, effects),
  };
}

export { FakeAuthAdmin };
