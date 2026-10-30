import { createClient } from '@supabase/supabase-js';
import { expect, test } from '../../support/core/fixtures';
import { closeCodes, codeSentTo, codesSent, family, openCodes, post } from '../../support/people/family-sign-in';
import { API } from '../../support/core/messages';
import { withSql } from '../../support/core/schedule';
import { stubReset } from '../../support/core/wa-stub';

// Family accounts (docs/30) on the real API, the local GoTrue and the WhatsApp stub: the phone code
// makes the guardian login on first use (a .invalid synthetic email), the session comes from
// verifyOtp(token_hash), a child sets their first password with a code sent to the guardian, and
// requests answer 202 whatever exists.

/** A fresh client of its own: the session it opens is the family's, nobody else's. */
const client = () => createClient(process.env['SUPABASE_URL'] ?? '', process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '', { auth: { persistSession: false } });

test.describe('family sign-in by WhatsApp code', () => {
  test.beforeEach(async () => {
    await stubReset();
    await openCodes();
  });
  test.afterEach(closeCodes);

  test('phone + code: the first sign-in makes one guardian login, verifyOtp opens a session', async () => {
    const f = await family();
    expect((await post('/auth/code/request', { phone: f.phone })).status).toBe(202);
    const code = await codeSentTo(f.phone);
    const res = await post('/auth/code/verify', { phone: f.phone, code });
    expect(res.status).toBe(200);
    const link = (await res.json()) as { token_hash: string; type: 'magiclink' };
    expect(Object.keys(link).sort()).toEqual(['token_hash', 'type']);
    const { data, error } = await client().auth.verifyOtp({ type: link.type, token_hash: link.token_hash });
    expect(error).toBeNull();
    expect(data.session?.access_token).toBeTruthy();
    const rows = await withSql((sql) => sql<{ email: string; role: string }[]>`
      select u.email, p.role from public.guardians g join public.profiles p on p.id = g.profile_id join auth.users u on u.id = p.id
      where g.id = ${f.guardianId}`);
    expect(rows).toEqual([{ email: `g-${f.guardianId}@family.invalid`, role: 'guardian' }]);
    // The code was spent: a replay fails with the generic answer.
    expect((await post('/auth/code/verify', { phone: f.phone, code })).status).toBe(401);
  });

  test('a child\'s first password: the code goes to the guardian, then username = student code', async () => {
    const f = await family();
    expect((await post('/auth/password/forgot', { identifier: f.code.toLowerCase() })).status).toBe(202);
    const code = await codeSentTo(f.phone);
    expect((await post('/auth/password/reset', { identifier: f.code, code, password: 'Child-e2e-123' })).status).toBe(204);
    const login = await post('/auth/login', { username: f.code.toLowerCase(), password: 'Child-e2e-123' });
    expect(login.status).toBe(200);
    const session = (await login.json()) as { access_token: string };
    const me = await fetch(`${API}/auth/me`, { headers: { authorization: `Bearer ${session.access_token}` } });
    expect(((await me.json()) as { role: string }).role).toBe('student');
  });

  test('requests answer 202 whatever exists, and codes go only to phones on file', async () => {
    const f = await family();
    const unknown = `+9665${String(Date.now()).slice(-8)}`;
    for (const body of [{ phone: unknown }, { phone: 'x' }]) expect((await post('/auth/code/request', body)).status).toBe(202);
    for (const identifier of ['nobody-here', 'AB-999999', unknown]) expect((await post('/auth/password/forgot', { identifier })).status).toBe(202);
    await expect.poll(() => codesSent(unknown), { timeout: 3_000 }).toBe(0);
    expect(await codesSent(f.phone)).toBe(0);
  });
});
