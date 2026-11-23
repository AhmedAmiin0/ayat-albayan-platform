import { expect, test } from '../../support/core/fixtures';
import { API, bearer } from '../../support/core/messages';
import { withSql } from '../../support/core/schedule';
import { stubReset } from '../../support/core/wa-stub';
import { closeCodes, codeSentTo, family, openCodes, post } from '../../support/people/family-sign-in';

// A student's own WhatsApp number on the real database through PostgREST: the
// one-to-one `own` embed and the nested `student_id is null` filters keep it the student's, never
// the family's «الرقم الثاني»; family sign-in finds it through guardian_phones and opens the
// student's own login. Example data only.

type Phones = { phone_e164: string }[];
interface View { student: { phone_e164: unknown }; guardian: { phones: Phones } }

/** A fresh Egyptian mobile number of the student's own (seedFamily numbers are Saudi). */
const ownNumber = () => `+20109${String(Date.now()).slice(-7)}`;

/** The family and its child, the child with a number of their own (set as staff set it). */
async function childWithNumber() {
  const f = await family();
  const own = ownNumber();
  await withSql((sql) => sql`select public.set_student_phone(${f.studentId}::uuid, null::uuid, ${own}::text)`);
  return { ...f, own };
}

const numbers = (phones: Phones) => phones.map((p) => p.phone_e164);

test.describe("a student's own number", () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));

  test('is the student\'s on «تعديل البيانات», and no family read lists it', async ({ asRole }) => {
    const f = await childWithNumber();
    const page = await asRole('admin');
    await page.goto('/admin');
    const headers = await bearer(page);
    const get = async (path: string): Promise<unknown> => {
      const res = await page.request.get(`${API}${path}`, { headers });
      expect(res.status(), path).toBe(200);
      return res.json();
    };
    const view = (await get(`/people/students/${f.studentId}`)) as View;
    expect(view.student.phone_e164).toBe(f.own);
    expect(numbers(view.guardian.phones)).toEqual([f.phone]);
    const profile = (await get(`/students/${f.studentId}`)) as { guardian: { phones: Phones } };
    expect(numbers(profile.guardian.phones)).toEqual([f.phone]);
    const guardian = (await get(`/guardians/${f.guardianId}`)) as { phones: Phones };
    expect(numbers(guardian.phones)).toEqual([f.phone]);
  });

  test.describe('signs the student in', () => {
    test.beforeEach(async () => {
      await stubReset();
      await openCodes();
    });
    test.afterEach(closeCodes);

    test('the code goes to that number and opens the student\'s own login', async () => {
      const f = await childWithNumber();
      expect((await post('/auth/code/request', { phone: f.own })).status).toBe(202);
      const code = await codeSentTo(f.own);
      expect((await post('/auth/code/verify', { phone: f.phone, code })).status).toBe(401);
      expect((await post('/auth/code/verify', { phone: f.own, code })).status).toBe(200);
      const rows = await withSql((sql) => sql<{ email: string; role: string }[]>`
        select u.email, p.role from public.students s join public.profiles p on p.id = s.profile_id
        join auth.users u on u.id = p.id where s.id = ${f.studentId}`);
      expect(rows).toEqual([{ email: `s-${f.studentId}@family.invalid`, role: 'student' }]);
    });
  });
});
