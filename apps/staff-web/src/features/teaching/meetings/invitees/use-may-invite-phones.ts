import { mayInvitePhones } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { meQuery } from '@ab/web-kit/auth/me';

/** Phone invites are for admin and sales only; hidden until /auth/me answers. */
export function useMayInvitePhones(): boolean {
  return mayInvitePhones(useQuery(meQuery).data?.role);
}
