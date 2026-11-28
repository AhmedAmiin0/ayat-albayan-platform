import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { formatPhone } from '@ab/core';
import { describe, expect, it, vi } from 'vitest';
import { ownProfileQuery } from './own-profile';
import { profileFacts } from './profile-facts';
import { ownStudent, whoLine } from './who-line';

const P = ar.portal.app.profile;
const A = ar.portal.app.account;
// A made-up number and fake names only.
const PHONE = '+966500000005';
const kid = { id: 's1', code: 'AB-2041', name: 'سلمى', tz: 'Asia/Riyadh', contact_is_self: true };
const profile = { full_name: 'أم سارة', email: null, phone_e164: PHONE };

describe('profileFacts', () => {
  it('a guardian: the name and the WhatsApp number, never a placeholder email', () => {
    const facts = profileFacts({ ...profile, email: 'p1@family.invalid' }, null, P);
    expect(facts).toEqual([
      { label: P.name, value: 'أم سارة', ltr: false },
      { label: P.whatsapp, value: formatPhone(PHONE), ltr: true },
    ]);
  });

  it('a student: a real email and their code, no number', () => {
    const own = { ...profile, phone_e164: null, email: 'student@example.com' };
    expect(profileFacts(own, kid, P).map((f) => f.label)).toEqual([P.name, P.email, P.code]);
    expect(profileFacts(own, kid, P).at(-1)?.value).toBe('AB-2041');
  });
});

describe('whoLine and ownStudent', () => {
  it('a guardian has no own student and reads «ولي أمر»', () => {
    const me = { kind: 'guardian' as const, students: [kid] };
    expect(ownStudent(me)).toBeNull();
    expect(whoLine(ownStudent(me), A)).toBe(A.guardian);
  });

  it('a student is their one student, with the code in the line', () => {
    const me = { kind: 'student' as const, students: [kid] };
    expect(ownStudent(me)).toBe(kid);
    expect(whoLine(kid, A)).toBe(A.student.replace('{code}', 'AB-2041'));
    expect(ownStudent({ kind: 'student', students: [] })).toBeNull();
  });
});

describe('ownProfileQuery', () => {
  const ID = '0b6f1a52-6d1e-4c43-9a37-3c5c8f1e2a10';
  const role = { base: null, key: null, name_ar: null, name_en: null };
  const clientAnswering = (answer: unknown) => {
    const apiFetch = vi.fn(async () => answer);
    return { apiFetch, client: { apiFetch, apiSend: vi.fn() } };
  };

  it('reads GET /me/profile through its route and parses it with the shared schema', async () => {
    const answer = { id: ID, ...profile, avatar_url: null, role };
    const { apiFetch, client } = clientAnswering(answer);
    const query = ownProfileQuery(client);
    expect(query.queryKey).toEqual(['me', 'profile']);
    expect(await query.queryFn()).toEqual(answer);
    expect(apiFetch).toHaveBeenCalledWith('/me/profile');
  });

  it('refuses an answer without a name', async () => {
    const { client } = clientAnswering({ id: ID, role });
    await expect(ownProfileQuery(client).queryFn()).rejects.toThrow();
  });

  it('refuses an id that is not a uuid', async () => {
    const { client } = clientAnswering({ id: 'p1', ...profile, avatar_url: null, role });
    await expect(ownProfileQuery(client).queryFn()).rejects.toThrow();
  });
});
