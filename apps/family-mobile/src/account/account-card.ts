import type { AccountProfile, PortalStudent } from '@ab/shared';
import { whoLine } from '@/profile';

/** A student's own name (the fallback) and id (their avatar tone); a guardian has neither. */
const ownBits = (own: PortalStudent | null) => ({ name: own?.name ?? '', seed: own?.id ?? null });

/** «حسابي»'s card: the login's name (else the student's), who signed in, the photo, the tone. */
export function accountCard(profile: AccountProfile | undefined, own: PortalStudent | null) {
  const bits = ownBits(own);
  return {
    name: profile?.full_name ?? bits.name,
    line: whoLine(own),
    photo: profile?.avatar_url ?? null,
    seed: bits.seed,
  };
}
