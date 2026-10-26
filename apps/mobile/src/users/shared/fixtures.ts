import type { LinkCandidate, UserDetail, UserRoleOption, UserView } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';

// Shared by the users tests (not a test itself): the web's users-test-kit fixtures and a GET fake.

export const SARA: UserView = {
  id: 'u1', email: 'sara@ab.co', full_name: 'سارة أحمد', phone_e164: '+966551234567', role: 'assistant', role_id: 'sys-assistant',
  role_key: 'assistant', status: 'active', disabled_at: null, last_sign_in_at: null, created_at: '2026-01-01T00:00:00Z', linked: null,
};
export const YOUSEF: UserView = {
  ...SARA, id: 'u2', email: 'yousef@ab.co', full_name: 'يوسف علي', phone_e164: null, role: 'student', status: 'disabled',
  linked: { kind: 'student', id: 's7', name: 'يوسف علي', code: 'AB-0007' },
};
export const DETAIL: UserDetail = { ...SARA, locale: 'ar', tz: 'Asia/Riyadh', disabled_reason: null };

type RoleSeed = Pick<UserRoleOption, 'id' | 'base_role' | 'name_ar'> & Partial<Pick<UserRoleOption, 'is_system' | 'assignable'>>;
const role = (r: RoleSeed): UserRoleOption => ({ key: r.id, name_en: null, is_system: false, assignable: true, ...r });
export const OPTIONS: UserRoleOption[] = [
  role({ id: 'sys-admin', base_role: 'admin', is_system: true, name_ar: 'مدير النظام', assignable: false }),
  role({ id: 'sys-assistant', base_role: 'assistant', is_system: true, name_ar: 'مساعد/ة' }),
  role({ id: 'c-acc', base_role: 'assistant', name_ar: 'محاسب' }),
  role({ id: 'c-secret', base_role: 'assistant', name_ar: 'سري', assignable: false }),
  role({ id: 'sys-student', base_role: 'student', is_system: true, name_ar: 'طالب' }),
];
export const CANDIDATES: LinkCandidate[] = [
  { kind: 'student', id: '0b0c53a6-6f0e-4f56-9d5d-0d6a3a0e6a11', name: 'يوسف علي', code: 'AB-0007' },
  { kind: 'student', id: '0b0c53a6-6f0e-4f56-9d5d-0d6a3a0e6a12', name: 'مريم', code: 'AB-0008' },
];

export interface FakeUsers {
  items?: UserView[];
  total?: number;
  detail?: UserDetail;
  /** GET /users?… fails (a 500). */
  failList?: boolean;
}

/** The users GETs by path, for a mocked apiFetch. */
export function usersGet({ items = [SARA, YOUSEF], total, detail = DETAIL, failList = false }: FakeUsers = {}) {
  return async (path: string): Promise<unknown> => {
    if (path.startsWith('/users/role-options')) return OPTIONS;
    if (path.startsWith('/users/link-candidates')) {
      const q = decodeURIComponent(path.split('&q=')[1] ?? '');
      return CANDIDATES.filter((c) => !q || c.name.includes(q) || c.code?.toLowerCase() === q.toLowerCase());
    }
    if (path.startsWith('/users?')) {
      if (failList) throw new ApiError(500, null);
      return { items, total: total ?? items.length, page: 1, pageSize: 20 };
    }
    if (path.startsWith('/users/')) return detail;
    return {};
  };
}
