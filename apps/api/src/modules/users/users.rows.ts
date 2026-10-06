import type { Database } from '@ab/db';
import type { UserRow } from './users.store';

type ListRow = Database['public']['Functions']['admin_list_users']['Returns'][number];

const KINDS = ['teacher', 'student', 'guardian'] as const;

/** One admin_list_users row → UserRow (the linked record's columns folded into `linked`). */
export function mapListRow(r: ListRow): UserRow {
  const kind = KINDS.find((k) => k === r.linked_kind);
  return {
    id: r.id,
    email: r.email,
    full_name: r.full_name,
    phone_e164: r.phone_e164,
    role: r.role,
    role_id: r.role_id,
    role_key: r.role_key,
    disabled_at: r.disabled_at,
    last_sign_in_at: r.last_sign_in_at,
    created_at: r.created_at,
    linked: kind && r.linked_id ? { kind, id: r.linked_id, name: r.linked_name ?? '', code: r.linked_code } : null,
  };
}
