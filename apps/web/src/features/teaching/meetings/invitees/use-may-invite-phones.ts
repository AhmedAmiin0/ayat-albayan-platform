import { mayInvitePhones } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { meQuery } from '@/features/people/auth/me';

/** «رقم هاتف» is offered to admin and sales only (owner policy 2026-10-13); hidden until /auth/me answers. */
export function useMayInvitePhones(): boolean {
  return mayInvitePhones(useQuery(meQuery).data?.role);
}
