import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { formatPhone } from '@ab/core';
import { describe, expect, it, vi } from 'vitest';
import { ownProfileQuery } from './own-profile.js';
import { profileFacts } from './profile-facts.js';
import { ownStudent, whoLine } from './who-line.js';

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
  it('parses /me/profile and drops the role', async () => {
    const answer = { id: 'p1', ...profile, avatar_url: null, role: { base: null } };
    const apiFetch = vi.fn(async () => answer);
    const query = ownProfileQuery({ apiFetch } as never);
    expect(query.queryKey).toEqual(['me', 'profile']);
    expect(await query.queryFn()).toEqual({ id: 'p1', ...profile, avatar_url: null });
    expect(apiFetch).toHaveBeenCalledWith('/me/profile');
  });

  it('refuses an answer without a name', async () => {
    const apiFetch = vi.fn(async () => ({ id: 'p1' }));
    await expect(ownProfileQuery({ apiFetch } as never).queryFn()).rejects.toThrow();
  });
});
