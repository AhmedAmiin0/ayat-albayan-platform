import { expect, test } from '../../support/core/fixtures';
import { auditActions, guardianPhone, inboundFor, leadsByPhone, pushesLike } from '../../support/messaging/inbound';
import { freshDigits, seedLead } from '../../support/core/messages';
import { seedFamily } from '../../support/core/schedule';
import { setMessaging, stubInbound, stubReset } from '../../support/core/wa-stub';

// «وقف الرسايل» (R-MSG-04, docs/12 §3.5): from a lead it pauses the follow-ups (the marketing
// opt-out, follow_up_paused_by 'lead', audited) and gets its own admin push; from a guardian
// nothing is paused (utility messages continue, no lead is created) and the text is only stored.

const POLL = { timeout: 30_000, intervals: [500, 1_000, 2_000] };
const STOP = 'وقف الرسايل';

test.describe('inbound WhatsApp — stop', () => {
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
  });
  test.afterEach(async () => {
    await setMessaging(false);
  });

  test('a lead typing «وقف الرسايل» or tapping the stop button pauses follow-ups, audited, with a push', async () => {
    const typed = freshDigits();
    const typedLead = await seedLead({ phone: `+${typed}`, name: `عميل ${typed.slice(-4)}`, status: 'contacted' });
    await stubInbound({ from: typed, text: STOP });
    await expect.poll(async () => (await leadsByPhone(`+${typed}`))[0]?.follow_up_paused, POLL).toBe(true);
    expect((await leadsByPhone(`+${typed}`))[0]?.follow_up_paused_by).toBe('lead');
    expect(await auditActions(typedLead)).toContain('follow_up_paused');
    expect((await inboundFor(`+${typed}`)).map((m) => m.body)).toEqual([STOP]);
    // A stop gets its own push (a burst cannot hide it): dedup key {phone}:stop:{wamid}.
    await expect.poll(async () => (await pushesLike({ kind: 'new_message', prefix: `+${typed}:stop:` })).length, POLL).toBeGreaterThan(0);

    // The template's quick-reply button carries «stop:<lead id>».
    const tapped = `${typed.slice(0, -1)}${(Number(typed.slice(-1)) + 1) % 10}`; // another fresh number
    const tappedLead = await seedLead({ phone: `+${tapped}`, name: `عميل ${tapped.slice(-4)}`, status: 'contacted' });
    await stubInbound({ from: tapped, button: { text: STOP, payload: `stop:${tappedLead}` } });
    await expect.poll(async () => (await leadsByPhone(`+${tapped}`))[0]?.follow_up_paused, POLL).toBe(true);
    expect((await leadsByPhone(`+${tapped}`))[0]?.follow_up_paused_by).toBe('lead');
    expect(await auditActions(tappedLead)).toContain('follow_up_paused');
  });

  test('a guardian typing «وقف الرسايل» is stored for the admin, creates no lead and pauses nothing', async () => {
    const family = await seedFamily('أم سلمى', ['سلمى']);
    const phone = await guardianPhone(family.guardianId);
    await stubInbound({ from: phone.slice(1), text: STOP });
    await expect.poll(async () => (await inboundFor(phone)).length, POLL).toBe(1);
    const [row] = await inboundFor(phone);
    expect(row).toMatchObject({ body: STOP, guardian_id: family.guardianId, lead_id: null });
    expect(await leadsByPhone(phone)).toHaveLength(0); // a guardian's message never creates a lead
  });
});
