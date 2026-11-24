import { mayInvitePhones } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, pathKey } from '@ab/mobile-kit';

/** The `role` of GET /auth/me, or null (no answer yet, an older API). */
export function roleOf(me: unknown): string | null {
  if (typeof me !== 'object' || me === null) return null;
  const role: unknown = Reflect.get(me, 'role');
  return typeof role === 'string' ? role : null;
}

/** Admin and sales only; hidden until /auth/me answers. */
export function useMayInvitePhones(): boolean {
  const me = useQuery({ queryKey: pathKey('/auth/me'), queryFn: () => apiFetch<unknown>('/auth/me') });
  return mayInvitePhones(roleOf(me.data));
}
