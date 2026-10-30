import { randomUUID } from 'node:crypto';
import { expect, test } from '../../support/core/fixtures';
import { API, bearer, messagesFor } from '../../support/core/messages';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, seedFamily, setAvailability, withSql } from '../../support/core/schedule';
import { setMessaging, stubReset, stubSent } from '../../support/core/wa-stub';

// The sender drops a queued booking confirmation whose lesson was cancelled meanwhile (send-stale.ts,
// docs/12 §3.3): status failed, error_code 'stale', and nothing reaches «Meta». S6 / R-MSG-01.

/** The sender ticks every 30 s: wait past one tick (journey 1). */
const SENDER_WAIT = { timeout: 75_000, intervals: [1_000, 2_000, 5_000] };

test.describe('stale confirmation (S6)', () => {
  test.skip(({ isMobile }) => isMobile, 'API-only scenario: the desktop run covers it');
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(false); // the confirmation waits in the queue
  });
  test.afterEach(async () => {
    await setMessaging(false);
  });

  test('booked while messaging is OFF, cancelled, then messaging ON → failed stale, the stub gets nothing', async ({ asRole }) => {
    test.setTimeout(150_000);
    const teacherId = await resetAbrar();
    const sunday = addDays(nextWeekSaturday(), 1);
    await setAvailability(teacherId, [[0, '16:00', '18:00']]);
    const family = await seedFamily('أم دانة', ['دانة']);
    const [studentId = ''] = family.studentIds;
    const [guardian] = await withSql((sql) => sql<{ phone_e164: string }[]>`
      select phone_e164 from public.guardians where id = ${family.guardianId}`);
    const phone = guardian?.phone_e164 ?? '';

    const page = await asRole('admin');
    await page.goto('/admin/schedule');
    const headers = await bearer(page);
    const booked = await page.request.post(`${API}/booking`, {
      headers,
      data: {
        teacherId,
        byday: [0],
        startTimeLocal: '16:00',
        tz: 'Asia/Riyadh',
        durationMin: 45,
        startsOn: sunday,
        kind: 'trial',
        package: 'trial',
        studentIds: [studentId],
        clientRequestId: randomUUID(),
        startsAt: riyadh(sunday, '16:00').toISOString(),
      },
    });
    expect(booked.status()).toBe(201);
    const { lessons } = (await booked.json()) as { lessons: { id: string }[] };
    const [lesson] = lessons;
    await expect.poll(async () => (await messagesFor(phone)).map((m) => m.status)).toEqual(['queued']);

    const cancel = await page.request.post(`${API}/lessons/${lesson?.id ?? ''}/cancel`, {
      headers,
      data: { scope: 'one', by: 'admin', reason: 'e2e stale' },
    });
    expect(cancel.ok()).toBe(true);

    await setMessaging(true);
    await expect
      .poll(async () => (await messagesFor(phone)).map((m) => [m.status, m.error_code]), SENDER_WAIT)
      .toEqual([['failed', 'stale']]);
    const toGuardian = (await stubSent()).filter((m) => m.to.replace(/\D/g, '') === phone.replace(/\D/g, ''));
    expect(toGuardian).toEqual([]);
  });
});
