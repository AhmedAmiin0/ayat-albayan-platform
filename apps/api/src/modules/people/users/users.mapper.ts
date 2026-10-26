import type { UserDetail, UserView } from '@ab/shared';
import type { UserRow } from './store/users.store';

export function toUserView(r: UserRow): UserView {
  return {
    id: r.id,
    email: r.email,
    full_name: r.full_name,
    phone_e164: r.phone_e164,
    role: r.role,
    role_id: r.role_id,
    role_key: r.role_key,
    status: r.disabled_at ? 'disabled' : 'active',
    disabled_at: r.disabled_at,
    last_sign_in_at: r.last_sign_in_at,
    created_at: r.created_at,
    linked: r.linked,
  };
}

export function toUserDetail(r: UserRow): UserDetail {
  return { ...toUserView(r), locale: r.locale ?? 'ar', tz: r.tz ?? 'Asia/Riyadh', disabled_reason: r.disabled_reason ?? null };
}
