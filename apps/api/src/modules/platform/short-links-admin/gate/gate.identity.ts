import type {
  LinkUserRow,
  LinkVisitRow,
} from '@/modules/platform/short-links-admin/managed/link-users.repo';
import type { PhoneOwner } from '@/modules/platform/short-links-admin/people';

/** A signed-in system user (with their phone on file, if any), or a phone verified by a code. */
export type Visitor =
  | { kind: 'profile'; profileId: string; phone: string | null }
  | { kind: 'phone'; phone: string; owner: PhoneOwner };

/** short_link_record_visit's arguments: who the visit row is keyed by and whom it matched. */
export interface VisitKey {
  p_profile: string | null;
  p_phone: string | null;
  p_matched_profile: string | null;
  p_matched_guardian: string | null;
}

type ByKind<R> = {
  [K in Visitor['kind']]: (v: Extract<Visitor, { kind: K }>) => R;
};
const byKind = <R>(table: ByKind<R>, v: Visitor): R =>
  v.kind === 'profile' ? table.profile(v) : table.phone(v);

/**
 * The visit row's identity: a system user by profile only; a phone by the phone, with the login or
 * family it belongs to when known (shown to the admin, never used to merge two visitors).
 */
export const visitKeyOf = (v: Visitor): VisitKey =>
  byKind<VisitKey>(
    {
      profile: (p) => ({
        p_profile: p.profileId,
        p_phone: null,
        p_matched_profile: null,
        p_matched_guardian: null,
      }),
      phone: (p) => ({
        p_profile: null,
        p_phone: p.phone,
        p_matched_profile: p.owner.profileId,
        p_matched_guardian: p.owner.guardianId,
      }),
    },
    v,
  );

/** The visitor opened this link before (the same visit row). */
export const isReturning = (visits: readonly LinkVisitRow[], v: Visitor): boolean => {
  const key = visitKeyOf(v);
  return visits.some(
    (r) => (key.p_profile ?? '') === r.profile_id || (key.p_phone ?? '') === r.phone_e164,
  );
};

export interface ListFacts {
  users: readonly LinkUserRow[];
  /** The phone on file of each listed profile (the WhatsApp send's phone sources). */
  listedPhones: ReadonlyMap<string, string>;
}

/** Is the visitor one of the link's users: by profile, by phone, or as a listed profile's phone? */
export const isListed = (v: Visitor, list: ListFacts): boolean =>
  byKind<boolean>(
    {
      profile: (p) =>
        list.users.some(
          (u) => u.profile_id === p.profileId || (p.phone !== null && u.phone_e164 === p.phone),
        ),
      phone: (p) =>
        list.users.some(
          (u) =>
            u.phone_e164 === p.phone ||
            (u.profile_id !== null &&
              (u.profile_id === p.owner.profileId ||
                list.listedPhones.get(u.profile_id) === p.phone)),
        ),
    },
    v,
  );
