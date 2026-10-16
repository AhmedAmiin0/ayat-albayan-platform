import { seedUser } from '../support/db';
import { ar, expect, test } from '../support/fixtures';
import { freshDigits } from '../support/messages';
import { salesNav, signInSales } from '../support/sales-portal';
import { riyadhDay } from '../support/sales-options';
import { resetAbrar, setAvailability } from '../support/schedule';
import { completeLesson, profileChip, startNow } from '../support/student-statuses';
import { setMessaging, stubInbound, stubReset } from '../support/wa-stub';
import { expectInMyPayments, registerWithTrial, saveSubscription, saveTransfer } from '../support/assistant-journey-ui';
import {
  apiAs, checkRegistration, childAndTrial, expectQuietStub, expectStatus, leadIdOf, newestPackage, openChat, shot,
} from '../support/assistant-journey';

// Journey 7 (owner 2026-10-15): the WHOLE student cycle as an assistant (base role sales), docs/16 + docs/18.
// A family writes in → the assistant checks the number, registers the child with a trial (written at once as
// «بانتظار الحلقة التجريبية») → the trial is attended («بانتظار الاشتراك») → she subscribes the family and
// records the bank transfer («مشترك», in «مدفوعاتي») → the package ends («بانتظار التجديد») → expired
// («انتهى الاشتراك») → she renews from the chat («مشترك» again). The assistant's buttons in the web UI;
// the API only where she has no action (the trial outcome, the renewal date, the expiry). Local Supabase
// and tools/wa-stub only, fake numbers; messaging stays off and nothing reaches the stub as a template.
// Expiry: the API has no hook to run StudentExpiryJob in e2e (and none is added to production), so the
// admin sets it (PATCH /students/:id with expected_status); the automatic move is unit-tested in
// apps/api student-expiry.job.test.ts.

const E = ar.enums.studentStatus;
const PASSWORD = 'Assistant-e2e-123';
const WEEKLY = 'weekly'; // «باقة الحلقة الأسبوعية»: 4 lessons, the smallest package of the catalog

test.describe('journey 7 — the assistant’s full student cycle (docs/16, docs/18)', () => {
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(false);
  });

  test('inbound → registered with a trial → attended → subscribed → ended → expired → renewed', async ({ browser, asRole, isMobile }) => {
    test.skip(isMobile, 'one family and one booking per run: the desktop run covers it');
    test.setTimeout(300_000);
    const info = test.info();
    const digits = freshDigits();
    const phone = `+${digits}`;
    const name = `ريم${digits.slice(-4)}`;
    const guardian = `أم ${name}`;
    const family = { phone, name };
    await setAvailability(await resetAbrar(), [[0, '16:00', '18:00']]);
    const email = `journey7-${digits.slice(-6)}@e2e.local`;
    const assistantId = await seedUser({ email, password: PASSWORD, role: 'sales', fullName: 'مساعدة الرحلة' });
    const admin = await asRole('admin');

    // 1. A family writes in. Auto-assign picks the least loaded salesperson: the admin gives the lead to ours.
    expect((await stubInbound({ from: digits, name: guardian, text: 'السلام عليكم' })).status).toBe(200);
    const lead = await leadIdOf(phone);
    expect((await apiAs(admin, { method: 'POST', path: `/leads/${lead}/assign`, data: { profileId: assistantId } })).status).toBe(200);
    const page = await signInSales(browser, email, info.outputPath('video')); // the owner's video (CI artifact)

    await test.step('1. a family writes in: the chat is in the assistant’s «المحادثات»', async () => {
      await (await salesNav(page)).getByRole('link', { name: ar.sales.nav.chats }).click();
      await expect(page.getByRole('link', { name: ar.inbox.openThread.replace('{name}', guardian) })).toBeVisible({ timeout: 30_000 });
      await shot(page, info, '01-inbound-chat');
      await expectQuietStub(phone);
    });

    await test.step('2. «تحقق من التسجيل»: not registered', async () => {
      await openChat(page, phone);
      await checkRegistration(page, ar.registrationCheck.notFoundPhone);
      await shot(page, info, '02-not-registered');
      await expectQuietStub(phone);
    });

    let ids = { studentId: '', lessonId: '' };
    await test.step('3. registered from the chat with a trial: «بانتظار الحلقة التجريبية»', async () => {
      await openChat(page, phone);
      await registerWithTrial(page, { name, guardian });
      ids = await childAndTrial(name);
      // A registration with a trial lesson writes the student as «بانتظار الحلقة التجريبية» at once
      // (docs/18 transition 1: create_booking, not a later new → trial move), so no status_change row yet.
      await expectStatus(page, { ...family, studentId: ids.studentId }, { from: null, to: 'trial', reason: null });
      await shot(page, info, '03-trial-booked');
      await expectQuietStub(phone);
    });
    const who = () => ({ ...family, studentId: ids.studentId });

    await test.step('4. the trial is attended (admin, API): «بانتظار الاشتراك», automatic', async () => {
      // Outcomes are refused before the start (409 not_started): the booked lesson is moved into the past.
      await startNow(ids.lessonId);
      expect(await completeLesson(admin, ids.lessonId)).toBe(200);
      await expectStatus(page, who(), { from: 'trial', to: 'pending_subscription', reason: 'trial_attended' });
      await shot(page, info, '04-trial-attended');
      await expectQuietStub(phone);
    });

    await test.step('5. «اشتراك جديد» + «سجّل تحويلًا بنكيًا» → «أصبح الطالب مشتركًا», in «مدفوعاتي»', async () => {
      await openChat(page, phone);
      await page.getByRole('button', { name: ar.salesMoney.newSubscription }).click();
      // The transfer step opens by itself; closed here to use the chat's own «سجّل تحويلًا بنكيًا».
      const step = await saveSubscription(page, WEEKLY);
      await step.getByRole('button', { name: ar.common.cancel }).click();
      const pkg = await newestPackage(ids.studentId);
      expect(pkg.lessons_total).toBe(4);
      await page.getByRole('button', { name: ar.salesMoney.recordTransfer }).click();
      const done = await saveTransfer(page, pkg.currency);
      await shot(page, info, '05-subscribed');
      await expectInMyPayments(done, name);
      await shot(page, info, '05b-my-payments');
      await expectStatus(page, who(), { from: 'pending_subscription', to: 'active', reason: 'payment' });
      await expectQuietStub(phone);
    });

    await test.step('6. the package ends (renewal date passed): «بانتظار التجديد»', async () => {
      // PATCH /subscriptions/:id is the admin's real write; the recompute after it ends the package.
      const pkg = await newestPackage(ids.studentId);
      const res = await apiAs(admin, { method: 'PATCH', path: `/subscriptions/${pkg.id}`, data: { renewsOn: riyadhDay(-1) } });
      expect(res.status, res.body).toBe(200);
      await expectStatus(page, who(), { from: 'active', to: 'pending_renewal', reason: null, via: 'subscription_ended' });
      await expect(page.getByRole('button', { name: ar.students.renew, exact: true })).toBeVisible();
      await shot(page, info, '06-pending-renewal');
      await expectQuietStub(phone);
    });

    await test.step('7. expiry (admin status change, CAS on pending_renewal): «انتهى الاشتراك»', async () => {
      const data = { status: 'expired', expected_status: 'pending_renewal' };
      const res = await apiAs(admin, { method: 'PATCH', path: `/students/${ids.studentId}`, data });
      expect(res.status, res.body).toBe(200);
      await admin.goto(`/admin/students/${ids.studentId}`);
      await expect(profileChip(admin, E.expired)).toBeVisible();
      await shot(admin, info, '07a-admin-expired');
      await expectStatus(page, who(), { from: 'pending_renewal', to: 'expired', reason: null });
      await shot(page, info, '07-expired');
      await expectQuietStub(phone);
    });

    await test.step('8. «جدّد الاشتراك» from the chat + bank transfer → «مشترك» again', async () => {
      await page.getByRole('button', { name: ar.students.renew, exact: true }).click();
      await saveSubscription(page, WEEKLY);
      const pkg = await newestPackage(ids.studentId);
      await saveTransfer(page, pkg.currency);
      await shot(page, info, '08-renewed');
      await expectStatus(page, who(), { from: 'expired', to: 'active', reason: 'payment' });
      await expect(page.getByRole('button', { name: ar.students.renew, exact: true })).toHaveCount(0);
      await shot(page, info, '08b-active-again');
      await expectQuietStub(phone);
    });
    await page.context().close(); // writes the video
  });
});
