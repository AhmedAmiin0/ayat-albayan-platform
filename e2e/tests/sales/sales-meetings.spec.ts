import { seedUser } from '../../support/db';
import { ar, expect, test } from '../../support/fixtures';
import { API, bearer } from '../../support/messages';
import { signInSales } from '../../support/sales/sales-portal';
import { seedFamily, withSql } from '../../support/schedule';
import { USERS } from '../../support/users';
import { setMessaging, stubInbound, stubReset, stubSent } from '../../support/wa-stub';

// R-MEET-01..03 (owner 2026-10-12): a salesperson schedules a meeting and invites a teacher (in-app
// bell) and two families: one with an open 24 h window (a chat text reaches the stub, never a
// template) and one without (window_closed, the link and the invitation text to copy). Cancelling
// revokes the personal links. Local Supabase + tools/wa-stub only; the numbers are seeded fakes.

const stamp = Date.now();

async function profileOf(email: string): Promise<string> {
  const [row] = await withSql((sql) => sql<{ id: string }[]>`select id from auth.users where email = ${email}`);
  if (!row) throw new Error(`no user ${email}`);
  return row.id;
}

test.describe('sales meetings', () => {
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
  });
  test.afterEach(() => setMessaging(false));

  test('schedule with invitations: bell, chat text, window_closed, cancel', async ({ browser, asRole }) => {
    const email = `meet-${stamp}@e2e.local`;
    await seedUser({ email, password: 'Assistant-e2e-123', role: 'sales', fullName: 'منسقة الاجتماعات' });
    const sales = await signInSales(browser, email);
    const teacherId = await profileOf(USERS.teacher.email);
    const open = await seedFamily('أم سهيلة', ['سهيلة']);
    const closed = await seedFamily('أم مريم', ['مريم']);
    const [openPhone] = await withSql((sql) => sql<{ phone_e164: string }[]>`select phone_e164 from public.guardians where id = ${open.guardianId}`);
    await stubInbound({ from: (openPhone?.phone_e164 ?? '').slice(1), text: 'السلام عليكم' });

    const title = `لقاء ${String(stamp).slice(-5)}`;
    const startsAt = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const invitees = [
      { kind: 'staff', profileId: teacherId },
      { kind: 'student', studentId: open.studentIds[0] },
      { kind: 'student', studentId: closed.studentIds[0] },
    ];
    const res = await sales.request.post(`${API}/meetings`, {
      headers: await bearer(sales),
      data: { title, startsAt, durationMin: 30, invitees, clientRequestId: crypto.randomUUID() },
    });
    expect(res.status()).toBe(201);
    const created = (await res.json()) as { id: string; invitees: { kind: string; status: string; link: string | null; invitation_text: string | null }[] };
    expect(created.invitees.map((i) => [i.kind, i.status])).toEqual([['staff', 'sent'], ['student', 'sent'], ['student', 'window_closed']]);
    const closedLink = created.invitees[2]?.link ?? '';
    expect(created.invitees[2]?.invitation_text).toContain(closedLink);
    expect(JSON.stringify(created)).not.toContain(openPhone?.phone_e164 ?? 'never');

    // The open window: one chat text (not a template) reaches the stub.
    await expect.poll(async () => (await stubSent()).filter((m) => `+${m.to}` === openPhone?.phone_e164).map((m) => m.type)).toEqual(['text']);

    // The teacher: a meeting_invite bell row and the meeting in GET /meetings.
    const bell = await withSql((sql) => sql<{ n: number }[]>`select count(*)::int as n from public.push_notifications
      where profile_id = ${teacherId} and kind = 'meeting_invite' and data->>'meetingId' = ${created.id}`);
    expect(bell[0]?.n).toBe(1);
    const teacher = await asRole('teacher');
    const list = await teacher.request.get(`${API}/meetings`, { headers: await bearer(teacher) });
    expect(((await list.json()) as { id: string }[]).map((m) => m.id)).toContain(created.id);

    // The sales page lists it.
    await sales.goto('/sales/meetings');
    await expect(sales.getByText(title)).toBeVisible();

    // Cancel: the personal link stops working.
    const token = closedLink.split('/').at(-1) ?? '';
    expect((await sales.request.get(`${API}/public/meetings/${token}`)).status()).toBe(200);
    const cancel = await sales.request.post(`${API}/meetings/${created.id}/cancel`, { headers: await bearer(sales) });
    expect(cancel.status()).toBe(204);
    expect((await sales.request.get(`${API}/public/meetings/${token}`)).status()).toBe(404);
    // The page heading: on a phone the same word in the closed «القائمة» sheet comes first and is hidden.
    await expect(sales.getByRole('heading', { level: 1, name: ar.meetingInvites.list.title })).toBeVisible();
  });
});
