import {
  userDetailSchema,
  userViewSchema,
  type UserDetail,
  type UserStatus,
  type UserView,
} from '@ab/shared';
import { asResponse } from '@/common/http/returns';
import type { UserRow } from './store/users.store';

const statusOf = (r: UserRow): UserStatus => (r.disabled_at ? 'disabled' : 'active');

const viewOf = (r: UserRow, avatarUrl: string | null | undefined) => ({
  id: r.id,
  email: r.email,
  full_name: r.full_name,
  phone_e164: r.phone_e164,
  role: r.role,
  role_id: r.role_id,
  role_key: r.role_key,
  status: statusOf(r),
  disabled_at: r.disabled_at,
  last_sign_in_at: r.last_sign_in_at,
  created_at: r.created_at,
  linked: r.linked,
  username: r.username ?? null,
  is_test: r.is_test ?? false,
  avatar_url: avatarUrl,
  avatar_seed: r.linked?.kind === 'teacher' ? r.linked.id : r.id,
});

/** `avatarUrl` undefined leaves the photo out of the answer, as create and lifecycle do. */
export function toUserView(r: UserRow, avatarUrl?: string | null): UserView {
  return asResponse(userViewSchema, viewOf(r, avatarUrl));
}

/** A write's answer: built from the row it just wrote, not checked (the write already ran). */
export function userDetailOf(r: UserRow, avatarUrl?: string | null): UserDetail {
  return {
    ...viewOf(r, avatarUrl),
    locale: r.locale ?? 'ar',
    tz: r.tz ?? 'Asia/Riyadh',
    disabled_reason: r.disabled_reason ?? null,
  };
}

export function toUserDetail(r: UserRow, avatarUrl?: string | null): UserDetail {
  return asResponse(userDetailSchema, userDetailOf(r, avatarUrl));
}
