import { ar, expect, test } from '../../support/core/fixtures';
import { seedSentConfirmation } from '../../support/messaging/inbound';
import { payloadsOf, quickRating, RATING, ratingRows, ratingsSentTo, startedLesson } from '../../support/reporting/lesson-rating';
import { API, bearer, setSetting } from '../../support/messages';
import { approveTemplates } from '../../support/reporting/teacher-templates';
import { setMessaging, stubInbound, stubReset } from '../../support/wa-stub';

// «تقييم الحلقة» by WhatsApp buttons (owner 2026-10-05, migration 195): a completed lesson sends
// lesson_rating; the guardian's tap is an inbound message, so it is stored as the rating and
// reopens the 24 h window. In a closed chat the admin can send it by hand.

const WAIT = { timeout: 90_000, intervals: [1_000, 2_000] };

test.describe('lesson rating by WhatsApp buttons', () => {
  test.skip(({ isMobile }) => isMobile, 'messaging is server-side; the desktop run covers the inbox');
  let restore: (() => Promise<void>) | null = null;
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
    await setSetting('auto_messages_enabled', true);
    await setSetting('feedback_mode', 'buttons');
  });
  test.afterEach(async () => {
    await setMessaging(false); // journeys 2–4 assert `queued`
    await setSetting('auto_messages_enabled', false);
    await setSetting('feedback_mode', 'buttons');
    await restore?.();
    restore = null;
  });

  test('complete → lesson_rating sent → a tap stores the rating, opens the chat, shows the chip', async ({ asRole }) => {
    test.setTimeout(240_000);
    const s = await startedLesson('لين');
    const admin = await asRole('admin');
    restore = await approveTemplates(admin, [RATING]);
    await admin.goto('/admin');
    const res = await admin.request.post(`${API}/lessons/${s.lessonId}/status`, { headers: await bearer(admin), data: { event: 'complete' } });
    expect(res.status()).toBe(200);

    await expect.poll(async () => (await ratingsSentTo(s.phone)).length, WAIT).toBe(1);
    const [sent] = await ratingsSentTo(s.phone);
    const payloads = payloadsOf(sent);
    expect(payloads).toEqual([`rate_excellent:${s.lessonId}`, `rate_good:${s.lessonId}`, `rate_needs_work:${s.lessonId}`]);
    expect(JSON.stringify(sent?.body)).toContain('لين');
    await expect.poll(() => ratingRows(s.lessonId), WAIT).toEqual([{ status: 'sent', dedup_key: `${RATING}:${s.lessonId}:${s.guardianId}` }]);

    await admin.goto(`/admin/inbox?phone=${encodeURIComponent(s.phone)}`);
    const banner = admin.getByTestId('window-banner');
    await expect(banner).toHaveText(ar.inbox.window.closed);

    await stubInbound({ from: s.phone.slice(1), button: { text: 'جيدة', payload: payloads[1] ?? '' }, context: sent?.id ?? '' });
    await expect.poll(() => quickRating(s.lessonId, s.studentId), WAIT).toEqual({ quick_rating: 'good', source: 'whatsapp_button' });
    await expect(banner).toHaveAttribute('data-open', 'true', { timeout: 30_000 });
    await expect(banner).toContainText(ar.inbox.window.open.split(' — ')[0] ?? '');
    await expect(admin.getByTestId('rating-chip')).toHaveText(ar.inbox.rating.chip.replace('{rating}', 'جيدة'));
    expect(await ratingRows(s.lessonId)).toHaveLength(1); // the 5-minute sweep never repeats it (dedup key)
  });

  test('feedback_mode «link»: nothing automatic; the admin sends the rating from the closed chat', async ({ asRole }) => {
    test.setTimeout(240_000);
    await setSetting('feedback_mode', 'link');
    const s = await startedLesson('تالا');
    const admin = await asRole('admin');
    restore = await approveTemplates(admin, [RATING]);
    await admin.goto('/admin');
    const res = await admin.request.post(`${API}/lessons/${s.lessonId}/status`, { headers: await bearer(admin), data: { event: 'complete' } });
    expect(res.status()).toBe(200);
    expect(await ratingRows(s.lessonId)).toEqual([]);

    // The booking confirmation gives the family a chat; they never wrote, so it is closed.
    await seedSentConfirmation({ phone: s.phone, guardianId: s.guardianId, lessonId: s.lessonId, waId: `wamid.e2e-${Date.now()}` });
    await admin.goto(`/admin/inbox?phone=${encodeURIComponent(s.phone)}`);
    await expect(admin.getByTestId('window-banner')).toHaveText(ar.inbox.window.closed);
    await admin.getByRole('button', { name: ar.inbox.rating.send }).click();
    await expect(admin.getByText(ar.inbox.rating.sent)).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => (await ratingsSentTo(s.phone)).length, WAIT).toBe(1);
    expect(await ratingRows(s.lessonId)).toEqual([{ status: 'sent', dedup_key: expect.stringMatching(/^admin:.+:rating:/) }]);
  });
});
