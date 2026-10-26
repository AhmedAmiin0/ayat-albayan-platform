import { mayInvitePhones } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

/** The `role` of GET /auth/me, or null (no answer yet, an older API). */
export function roleOf(me: unknown): string | null {
  if (typeof me !== 'object' || me === null) return null;
  const role: unknown = Reflect.get(me, 'role');
  return typeof role === 'string' ? role : null;
}

/** «رقم هاتف» is offered to admin and sales only (owner policy 2026-10-13); hidden until /auth/me answers. */
export function useMayInvitePhones(): boolean {
  const me = useQuery({ queryKey: pathKey('/auth/me'), queryFn: () => apiFetch<unknown>('/auth/me') });
  return mayInvitePhones(roleOf(me.data));
}
