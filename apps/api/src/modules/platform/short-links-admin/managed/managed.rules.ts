import { SHORT_LINK_MAX_DAYS } from '@ab/shared';
import { apiPublicOrigin } from '@/common/http/public-origin';
import { allowedHosts, extraHosts } from '@/modules/platform/short-links';
import type { LinkUserRow } from './link-users.repo';

const DAY_MS = 86_400_000;

/** System links never take the extra hosts. */
export const managedHosts = (webOrigin: string, extraRaw: string): Set<string> =>
  new Set([...allowedHosts([...webOrigin.split(','), apiPublicOrigin()]), ...extraHosts(extraRaw)]);

/**
 * The expiry of a new or edited link: the given instant, else now + the default days. null when it
 * is not in the future or later than SHORT_LINK_MAX_DAYS from now.
 */
export function expiryOf(given: string | undefined, at: { now: Date; days: number }): Date | null {
  const now = at.now.getTime();
  const when = given === undefined ? now + at.days * DAY_MS : Date.parse(given);
  const inRange = when > now && when <= now + SHORT_LINK_MAX_DAYS * DAY_MS;
  return inRange ? new Date(when) : null;
}

export interface WantedUsers {
  profileIds: readonly string[];
  phones: readonly string[];
}

/** The new list against the stored one: rows to add, ids to remove (kept rows keep their state). */
export function diffUsers(stored: readonly LinkUserRow[], wanted: WantedUsers) {
  const profiles = new Set(wanted.profileIds);
  const phones = new Set(wanted.phones);
  const keep = (r: LinkUserRow): boolean =>
    (r.profile_id !== null && profiles.has(r.profile_id)) ||
    (r.phone_e164 !== null && phones.has(r.phone_e164));
  const hadProfile = new Set(stored.flatMap((r) => (r.profile_id ? [r.profile_id] : [])));
  const hadPhone = new Set(stored.flatMap((r) => (r.phone_e164 ? [r.phone_e164] : [])));
  return {
    removeIds: stored.filter((r) => !keep(r)).map((r) => r.id),
    addProfiles: [...profiles].filter((p) => !hadProfile.has(p)),
    addPhones: [...phones].filter((p) => !hadPhone.has(p)),
  };
}
