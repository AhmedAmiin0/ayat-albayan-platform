import { describe, expect, it } from 'vitest';
import type {
  LinkUserRow,
  LinkVisitRow,
} from '@/modules/platform/short-links-admin/managed/link-users.repo';
import type { PhoneOwner } from '@/modules/platform/short-links-admin/people';
import { isListed, isReturning, visitKeyOf, type Visitor } from './gate.identity';

const P1 = '00000000-0000-4000-8000-0000000000c1';
const P2 = '00000000-0000-4000-8000-0000000000c2';
const G1 = '00000000-0000-4000-8000-0000000000d1';
const PHONE = '+201000000001';

const user = (over: Partial<LinkUserRow>): LinkUserRow => ({
  id: 'u1',
  code: 'Ab12Cd34Ef',
  profile_id: null,
  phone_e164: null,
  added_by: null,
  send_status: 'not_sent',
  send_error: null,
  send_attempts: 0,
  sent_at: null,
  created_at: '2026-11-17T12:00:00Z',
  ...over,
});
const visit = (over: Partial<LinkVisitRow>): LinkVisitRow => ({
  id: 'v1',
  code: 'Ab12Cd34Ef',
  profile_id: null,
  phone_e164: null,
  matched_profile_id: null,
  matched_guardian_id: null,
  first_at: '',
  last_at: '',
  opens: 1,
  ...over,
});
const byProfile: Visitor = { kind: 'profile', profileId: P1, phone: PHONE };
const byPhone = (owner: PhoneOwner = { profileId: null, guardianId: null }): Visitor => ({
  kind: 'phone',
  phone: PHONE,
  owner,
});
const noPhones = new Map<string, string>();

describe('the visitor identity (docs/19)', () => {
  it('a system user is keyed by profile only', () => {
    expect(visitKeyOf(byProfile)).toEqual({
      p_profile: P1,
      p_phone: null,
      p_matched_profile: null,
      p_matched_guardian: null,
    });
  });

  it('a verified phone is keyed by phone, with the login and family it matched', () => {
    expect(visitKeyOf(byPhone({ profileId: P2, guardianId: G1 }))).toEqual({
      p_profile: null,
      p_phone: PHONE,
      p_matched_profile: P2,
      p_matched_guardian: G1,
    });
    expect(visitKeyOf(byPhone()).p_matched_profile).toBeNull();
  });

  it('returning: the same profile or the same phone; a matched login never merges visitors', () => {
    expect(isReturning([visit({ profile_id: P1 })], byProfile)).toBe(true);
    expect(isReturning([visit({ phone_e164: PHONE })], byPhone())).toBe(true);
    expect(isReturning([visit({ phone_e164: PHONE })], byProfile)).toBe(false);
    expect(
      isReturning([visit({ profile_id: P2 })], byPhone({ profileId: P2, guardianId: null })),
    ).toBe(false);
    expect(isReturning([], byProfile)).toBe(false);
  });

  it('listed: a profile by its id or its phone on file', () => {
    expect(isListed(byProfile, { users: [user({ profile_id: P1 })], listedPhones: noPhones })).toBe(
      true,
    );
    expect(
      isListed(byProfile, { users: [user({ phone_e164: PHONE })], listedPhones: noPhones }),
    ).toBe(true);
    expect(isListed(byProfile, { users: [user({ profile_id: P2 })], listedPhones: noPhones })).toBe(
      false,
    );
  });

  it("listed: a phone by itself, by its matched login, or as a listed profile's phone", () => {
    const listed = { users: [user({ profile_id: P2 })], listedPhones: noPhones };
    expect(
      isListed(byPhone(), { users: [user({ phone_e164: PHONE })], listedPhones: noPhones }),
    ).toBe(true);
    expect(isListed(byPhone({ profileId: P2, guardianId: null }), listed)).toBe(true);
    expect(isListed(byPhone(), { ...listed, listedPhones: new Map([[P2, PHONE]]) })).toBe(true);
    expect(isListed(byPhone(), listed)).toBe(false);
  });
});
