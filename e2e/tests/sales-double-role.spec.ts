import type { Browser } from '@playwright/test';
import { family, makeAssistant, message, TAG } from '../support/assistant-api';
import { ar, expect, test } from '../support/fixtures';
import { lastOutbound } from '../support/messaging/inbox';
import { salesNav, seedBooked, seedMine, setSalesStarter, signInSales } from '../support/sales-portal';

// Sales double role (owner 2026-10-11, docs/16): the salesperson also does the classroom assistant's job.
// She reads a chat that is not hers, opens the history of a confirmed subscription she made (with its payment amounts),
// sees the teachers (master-detail) and every student, the academy's day read-only, and a lesson running now
// with «ادخل الحلقة». Owner report 2026-10-12: she starts a conversation with a template, one the
// admin offers to sales («قالب بدء محادثة للمبيعات»; sales-starter.spec covers the chat line's own).

const composer = ar.inbox.composer;

test.describe('sales double role', () => {
  test('a chat that is not hers, a confirmed subscription history, teachers, all students, the schedule and a running lesson', async ({ browser }) => {
    const me = await makeAssistant(`dr${test.info().project.name}`);
    const other = await makeAssistant(`do${test.info().project.name}`);
    const names = { mine: `مؤكدة${TAG}`, foreign: `نسرين${TAG}`, teacher: `معلمة${TAG}`, says: `سلام عليكم ${TAG}` };
    const foreign = await family(other.id, names.foreign);
    await message({ phone: foreign.phone, guardian: foreign.guardian, direction: 'inbound', body: names.says });
    await seedMine({ salesId: me.id, name: names.mine, teacher: names.teacher });
    const page = await signInSales(browser, me.email);

    // Another salesperson's family: the chat opens and reads (it was 403 before).
    await page.goto(`/sales/inbox?phone=${encodeURIComponent(foreign.phone)}`);
    await expect(page.getByRole('log', { name: ar.messages.log }).getByText(names.says)).toBeVisible();

    // The landing's running-lessons chip (the list's head row) leads to /sales/live: my student's lesson, «ادخل الحلقة» open.
    await page.goto('/sales/inbox');
    await page.getByRole('link', { name: new RegExp(ar.sales.live.strip.replace('{n}', '\\d+')) }).click();
    const lesson = page.getByRole('listitem').filter({ hasText: names.mine });
    await expect(lesson).toContainText(names.teacher);
    await expect(lesson.getByRole('link', { name: ar.classroom.enter })).toBeVisible();

    // «المعلمون»: the teacher's row (in a lesson now), then the drawer with the student as a list item.
    await (await salesNav(page)).getByRole('link', { name: ar.sales.nav.teachers }).click();
    await page.getByRole('searchbox', { name: ar.sales.teachers.search }).fill(names.teacher);
    const row = page.getByRole('list', { name: ar.sales.teachers.listLabel }).getByRole('button', { name: new RegExp(names.teacher) });
    await expect(row).toContainText(ar.sales.teachers.liveNow);
    await row.click();
    const drawer = page.getByRole('dialog', { name: ar.sales.teachers.detailTitle.replace('{name}', names.teacher) });
    // «مشترك» is the default segment (owner 2026-10-12); «الكل» shows the student whatever her status.
    await drawer.getByRole('group', { name: ar.studentLists.kinds }).getByRole('button', { name: new RegExp(`^${ar.studentLists.all}`) }).click();
    await expect(drawer.getByRole('listitem').filter({ hasText: names.mine })).toContainText(ar.enums.program.quran);

    // «جدول الحلقات» from the drawer: that teacher's day, read-only, the running lesson with «ادخل الحلقة».
    await drawer.getByRole('link', { name: ar.sales.teachers.openSchedule }).click();
    await page.waitForURL('**/sales/schedule?teacherId=*');
    const day = page.getByRole('region', { name: names.teacher });
    await expect(day).toContainText(names.mine);
    await expect(day).toContainText(ar.sales.academySchedule.liveNow);
    await expect(day.getByRole('link', { name: ar.classroom.enter })).toBeVisible();
    // The only buttons are the lesson chips: one opens the read-only lesson drawer (no admin action).
    const board = page.getByRole('region', { name: ar.schedule.dayBoard });
    await expect(board.getByRole('button', { disabled: false })).toHaveCount(1);
    await board.getByRole('button', { name: new RegExp(names.mine) }).click();
    const details = page.getByRole('dialog', { name: names.mine });
    await expect(details).toContainText(ar.lessons.sheet.readOnly);
    await expect(details.getByRole('link', { name: ar.classroom.enter })).toBeVisible();
    // «إغلاق» is its only button: no confirm, cancel, move, edit, invoice or report.
    await expect(details.getByRole('button')).toHaveCount(1);
    await details.getByRole('button', { name: ar.common.close }).click();
    await expect(details).toBeHidden();

    await (await salesNav(page)).getByRole('link', { name: ar.sales.nav.allStudents }).click();
    await page.getByRole('searchbox', { name: ar.sales.allStudents.search }).fill(names.foreign);
    await expect(page.getByRole('row').filter({ hasText: names.foreign })).toContainText(`أم ${names.foreign}`);

    await page.goto('/sales/subscriptions?kind=confirmed');
    await page.getByRole('button', { name: ar.sales.history.openFor.replace('{name}', names.mine) }).click();
    const history = page.getByRole('region', { name: ar.sales.history.title.replace('{name}', names.mine) });
    await expect(history).toContainText(ar.sales.history.current);
    await expect(history).toContainText(ar.enums.paymentKind.payment);
    await expect(history).toContainText(`333 ${ar.pricing.currencies.SAR}`);
  });

  test('sales starts a conversation with a template', async ({ browser }) => {
    // Sales list and send only starters: offer this one for the test, then put it back.
    await setSalesStarter('booking_confirmation_plain', true);
    try {
      await startsWithTemplate(browser);
    } finally {
      await setSalesStarter('booking_confirmation_plain', false);
    }
  });
});

/** Owner report 2026-10-12: a family that never wrote; sales opens the chat with an approved starter. */
async function startsWithTemplate(browser: Browser): Promise<void> {
  const me = await makeAssistant(`dc${test.info().project.name}`);
  const names = { student: `بداية${TAG}`, teacher: `معلمة بداية${TAG}`, reply: `وعليكم السلام ${TAG}` };
  const booked = await seedBooked({ name: names.student, teacher: names.teacher });
  const page = await signInSales(browser, me.email);

  // «محادثة جديدة»: the family never wrote; the number opens the first-template pane (the templates load: no 403).
  await page.goto('/sales/inbox');
  await page.getByRole('button', { name: ar.inbox.newChat.title }).click();
  await page.getByLabel(ar.inbox.newChat.phone).fill(booked.phone);
  await page.getByRole('button', { name: ar.inbox.newChat.open }).click();
  await expect(page.getByText(ar.inbox.newChat.firstTemplate)).toBeVisible();
  await page.getByLabel(composer.chooseTemplate).selectOption({ label: ar.templates.names.booking_confirmation_plain });
  await page.getByLabel(composer.pickLesson).selectOption({ index: 1 });
  await expect(page.getByLabel(composer.paramNames.student_names, { exact: true })).toHaveValue(names.student);
  await page.getByRole('button', { name: composer.sendTemplate, exact: true }).click();

  // Queued as hers (sales dedup space); the thread now exists, its window closed: templates only.
  const log = page.getByRole('log', { name: ar.messages.log });
  await expect(log).toContainText(ar.inbox.templateLine.replace('{name}', ar.templates.names.booking_confirmation_plain));
  await expect(page.getByText(ar.inbox.sessionClosed)).toBeVisible();
  const sent = await lastOutbound(booked.phone);
  expect([sent.template_key, sent.created_by]).toEqual(['booking_confirmation_plain', me.id]);
  expect(sent.dedup_key).toMatch(new RegExp(`^sales:${me.id}:`));

  // The family replies: inside the 24 h window she writes plain text.
  await message({ phone: booked.phone, guardian: booked.guardian, direction: 'inbound', body: names.reply });
  await page.reload();
  await expect(log.getByText(names.reply)).toBeVisible();
  await page.getByRole('textbox', { name: composer.messageLabel }).fill(`أهلًا ${TAG}`);
  await page.getByRole('button', { name: composer.send, exact: true }).click();
  await expect.poll(async () => (await lastOutbound(booked.phone)).body).toBe(`أهلًا ${TAG}`);
}
