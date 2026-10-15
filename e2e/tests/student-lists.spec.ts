import type { Locator, Page } from '@playwright/test';
import { makeAssistant } from '../support/assistant-api';
import { ar, expect, test } from '../support/fixtures';
import { signInSales } from '../support/sales-portal';
import { withSql } from '../support/schedule';
import { dropFilterStudents, filterSeed, seedFilterStudents, type FilterSeed } from '../support/student-filters';

// «مشترك / تجريبي» (owner 2026-10-12): the sales «المعلمون» drawer splits a teacher's students and
// shows the teacher's fixed link; the admin teachers list counts link to the filtered students list;
// the students list has a quick switch on the same `status` URL filter. One seeded teacher with an
// active, a trial and a paused student (support/student-filters).

const STAMP = `${String(Date.now()).slice(-5)}7`;
const LINK = `https://meet.example.org/e2e-fixed-${STAMP}`;
const L = ar.studentLists;
const state: { seed?: FilterSeed } = {};

function seeded(): FilterSeed {
  if (!state.seed) throw new Error('not seeded');
  return state.seed;
}

/** The «الكل · مشترك · تجريبي» group and one of its segments (label, then its count). */
const kindSwitch = (scope: Page | Locator) => scope.getByRole('group', { name: L.kinds });
const segment = (group: Locator, label: string) => group.getByRole('button', { name: new RegExp(`^${label}`) });

async function expectNames(scope: Page | Locator, shown: string[], hidden: string[]) {
  for (const n of shown) await expect(scope.getByText(n, { exact: true }).first()).toBeVisible();
  for (const n of hidden) await expect(scope.getByText(n, { exact: true })).toHaveCount(0);
}

test.describe('student lists «مشترك / تجريبي»', () => {
  test.beforeAll(async () => {
    state.seed = await seedFilterStudents(filterSeed(STAMP));
    const { teacherId } = state.seed;
    await withSql((sql) => sql`update public.teachers set meeting_link = ${LINK} where id = ${teacherId}`);
  });
  test.afterAll(async () => {
    if (state.seed) await dropFilterStudents(state.seed);
  });

  test('sales «المعلمون»: the row counts, the drawer split by kind and the teacher’s fixed link', async ({ browser }) => {
    const { teacherName, names } = seeded();
    const me = await makeAssistant(`sl${test.info().project.name}`);
    const page = await signInSales(browser, me.email);
    await page.goto('/sales/teachers');
    await page.getByRole('searchbox', { name: ar.sales.teachers.search }).fill(teacherName);
    const row = page.getByRole('list', { name: ar.sales.teachers.listLabel }).getByRole('button', { name: new RegExp(teacherName) });
    await expect(row).toContainText(L.counts.replace('{active}', '1').replace('{trial}', '1'));
    await row.click();
    const drawer = page.getByRole('dialog', { name: ar.sales.teachers.detailTitle.replace('{name}', teacherName) });

    const kinds = kindSwitch(drawer);
    await expect(segment(kinds, L.active)).toHaveAttribute('aria-pressed', 'true');
    await expectNames(drawer, [names.active], [names.trial, names.paused]);
    await segment(kinds, L.trial).click();
    await expectNames(drawer, [names.trial], [names.active, names.paused]);
    await segment(kinds, L.all).click();
    await expectNames(drawer, [names.active, names.trial, names.paused], []);

    const fixed = drawer.getByRole('region', { name: L.meetingLink });
    await expect(fixed.getByText(LINK)).toBeVisible();
    await expect(fixed.getByRole('link', { name: L.openLink })).toHaveAttribute('href', LINK);
    await expect(fixed.getByRole('button', { name: L.copyLink })).toBeVisible();
  });

  test('admin teachers list: «مشترك» / «تجريبي» counts open the students list filtered by teacher and status', async ({ asRole }) => {
    const { teacherId, teacherName, names } = seeded();
    const page = await asRole('admin');
    await page.goto(`/admin/teachers?f_name=${encodeURIComponent(teacherName)}`);
    const linkOf = (key: 'activeLink' | 'trialLink') =>
      page.getByRole('link', { name: L[key].replace('{name}', teacherName).replace('{n}', '1') });
    await expect(linkOf('trialLink')).toBeVisible();
    await linkOf('activeLink').click();
    await expect(page).toHaveURL(/\/admin\/students\?/);
    await expect(page).toHaveURL(new RegExp(`teacher=${teacherId}`));
    await expect(page).toHaveURL(/status=active/);
    await expect(segment(kindSwitch(page), L.active)).toHaveAttribute('aria-pressed', 'true');
    await expectNames(page, [names.active], [names.trial, names.paused]);
  });

  test('students list: the quick switch writes the status URL filter, outside «تصفية»', async ({ asRole }) => {
    const { teacherId, names } = seeded();
    const page = await asRole('admin');
    await page.goto(`/admin/students?teacher=${teacherId}`);
    const kinds = kindSwitch(page);
    await expect(segment(kinds, L.all)).toHaveAttribute('aria-pressed', 'true');
    await expectNames(page, [names.active, names.trial, names.paused], []);

    // «تجريبي» = not subscribed yet (owner 2026-10-15, docs/18): new, trial and pending_subscription.
    await segment(kinds, L.trial).click();
    await expect(page).toHaveURL(/status=new(,|%2C)trial(,|%2C)pending_subscription(&|$)/);
    await expect(page).toHaveURL(new RegExp(`teacher=${teacherId}`));
    await expectNames(page, [names.trial], [names.active, names.paused]);

    await segment(kinds, L.all).click();
    await expect(page).not.toHaveURL(/status=/);
    await expectNames(page, [names.active, names.trial, names.paused], []);

    await page.goto(`/admin/students?teacher=${teacherId}&status=paused`);
    await expectNames(page, [names.paused], [names.active, names.trial]);
    await expect(kinds.getByRole('button', { pressed: true })).toHaveCount(0);
  });
});
