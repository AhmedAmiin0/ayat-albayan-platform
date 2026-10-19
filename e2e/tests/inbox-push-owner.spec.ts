import { freshPhone, leadOf, makeAssistant } from '../support/assistant-api';
import { expect, test } from '../support/fixtures';
import { pushesForProfile } from '../support/inbox';
import { withSql } from '../support/schedule';
import { USERS } from '../support/users';
import { stubInbound, stubReset } from '../support/wa-stub';

// docs/21 D3 (R-NOT-01): the bell of a chat goes to its owning assistant only; an unowned chat and a
// new lead go to every assistant; the admin is alerted as before. API level against tools/wa-stub, with
// push delivery off in CI: only the bell rows (push_notifications) are read. Parallel specs create other
// assistants, so only A and B are asserted on.

const WAIT = { timeout: 30_000, intervals: [500, 1_000, 2_000] };
/** = webhook.inbound.ts PUSH_BUCKET_MS: one new_message row per phone and profile per 10 minutes. */
const BUCKET_MS = 10 * 60_000;

async function adminId(): Promise<string> {
  const [row] = await withSql((sql) => sql<{ id: string }[]>`select id from auth.users where email = ${USERS.admin.email}`);
  if (!row) throw new Error('admin missing (global setup)');
  return row.id;
}

/** A guardian / lead writes from `phone` (E.164); the webhook has stored it when this resolves. */
async function inbound(phone: string, text: string): Promise<void> {
  expect((await stubInbound({ from: phone.slice(1), text })).status).toBe(200);
}

test.describe('inbox pushes to assistants (docs/21 D3)', () => {
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'API level: one run');
    await stubReset();
  });

  test('owned chat → only its assistant; unassigned → the others too; the admin always', async () => {
    test.setTimeout(90_000);
    const [a, b] = [await makeAssistant('pusha'), await makeAssistant('pushb')];
    const admin = await adminId();
    const phone = freshPhone();
    await leadOf(a.id, phone);
    const count = (profileId: string) => pushesForProfile({ profileId, kind: 'new_message', phone });

    const first = Date.now();
    await inbound(phone, 'السلام عليكم، متى الحلقة؟');
    await expect.poll(() => count(a.id), WAIT).toBe(1);
    await expect.poll(() => count(admin), WAIT).toBe(1);
    expect(await count(b.id)).toBe(0);

    await withSql((sql) => sql`update public.leads set assigned_to = null where phone_e164 = ${phone}`);
    const second = Date.now();
    await inbound(phone, 'هل وصلت رسالتي؟');
    await expect.poll(() => count(b.id), WAIT).toBe(1);
    // Same 10-minute bucket: A's row has the same dedup key, so A gains nothing.
    if (Math.floor(first / BUCKET_MS) === Math.floor(second / BUCKET_MS)) expect(await count(a.id)).toBe(1);
  });

  test('a new number → new_lead for every assistant', async () => {
    const [a, b] = [await makeAssistant('pushla'), await makeAssistant('pushlb')];
    const phone = freshPhone();
    await inbound(phone, 'السلام عليكم، أريد التسجيل');
    const count = (profileId: string) => pushesForProfile({ profileId, kind: 'new_lead', phone });
    await expect.poll(() => count(a.id), WAIT).toBe(1);
    await expect.poll(() => count(b.id), WAIT).toBe(1);
  });
});
