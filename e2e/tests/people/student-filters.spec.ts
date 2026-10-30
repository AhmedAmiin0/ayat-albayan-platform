import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { openFilters, showResults } from '../../support/core/filters';
import { dropFilterStudents, filterSeed, seedFilterStudents, type FilterSeed } from '../../support/people/student-filters';

// R-STU-01: the students list filters live in the URL (shareable, survive a reload) and are applied
// by GET /students; R-TCH-03: the teacher profile lists her students through the same API.

const SEED = filterSeed(String(Date.now()).slice(-6));
const state: { seed?: FilterSeed } = {};
const E = ar.enums.studentStatus;

function seeded(): FilterSeed {
  if (!state.seed) throw new Error('not seeded');
  return state.seed;
}

async function expectNames(page: Page, shown: string[], hidden: string[]) {
  for (const n of shown) await expect(page.getByText(n, { exact: true }).first()).toBeVisible();
  for (const n of hidden) await expect(page.getByText(n, { exact: true })).toHaveCount(0);
}

test.describe('students filters', () => {
  test.beforeAll(async () => {
    state.seed = await seedFilterStudents(SEED);
  });
  test.afterAll(async () => {
    if (state.seed) await dropFilterStudents(state.seed);
  });

  test('filter by teacher and status: URL carries them, a reload keeps them, «مسح الكل» drops them', async ({ asRole }, info) => {
    test.skip(info.project.name === 'mobile', 'the URL round trip runs once; the phone sheet has its own test');
    const { teacherId, names } = seeded();
    const page = await asRole('admin');
    await page.goto('/admin/students');
    const panel = await openFilters(page);
    await panel.getByRole('combobox', { name: ar.students.teacher }).selectOption(teacherId);
    await expect(page).toHaveURL(new RegExp(`teacher=${teacherId}`));
    await expectNames(page, [names.active, names.trial, names.paused], [names.unassigned]);
    await expect(page.getByText(ar.students.count.replace('{n}', '3'))).toBeVisible();

    await panel.getByText(E.active, { exact: true }).click();
    await expect(page).toHaveURL(/status=active/);
    await showResults(panel);
    await expectNames(page, [names.active], [names.trial, names.paused]);

    await page.reload();
    const chips = page.getByRole('list', { name: ar.table.activeFilters });
    await expect(chips).toContainText(ar.table.activeFilter.replace('{label}', ar.students.status).replace('{value}', E.active));
    await expect((await openFilters(page)).getByRole('checkbox', { name: E.active })).toBeChecked();
    await expectNames(page, [names.active], [names.trial, names.paused]);

    await page.getByRole('dialog').getByRole('button', { name: ar.table.clearAll }).click();
    await expect(page).not.toHaveURL(/teacher=|status=/);
    await expect(page.getByText(names.unassigned, { exact: true }).first()).toBeVisible();
  });

  test('«بدون معلم» and the package / weekly filters at the API', async ({ asRole }, info) => {
    test.skip(info.project.name === 'mobile', 'URL-level checks run once, on desktop');
    const { names } = seeded();
    const page = await asRole('admin');
    await page.goto('/admin/students?teacher=none&package=none&weekly=no');
    await expectNames(page, [names.unassigned], [names.active, names.trial]);
    await page.goto('/admin/students?teacher=none&package=active');
    await expectNames(page, [], [names.unassigned]);
  });

  test('phones: «تصفية» opens the sheet; a status chip there filters the list', async ({ asRole }, info) => {
    test.skip(info.project.name !== 'mobile', 'the sheet is the phone layout');
    const { teacherId, names } = seeded();
    const page = await asRole('admin');
    await page.goto(`/admin/students?teacher=${teacherId}`);
    const sheet = await openFilters(page);
    await sheet.getByText(E.trial, { exact: true }).click();
    await showResults(sheet);
    await expect(page).toHaveURL(/status=trial/);
    await expectNames(page, [names.trial], [names.active, names.paused]);
  });

  test('teacher profile «الطلاب»: her current students, counts, all statuses, link to the list', async ({ asRole }) => {
    const { teacherId, names } = seeded();
    const page = await asRole('admin');
    await page.goto(`/admin/teachers/${teacherId}`);
    await page.getByRole('tab', { name: ar.teachers.tabStudents }).click();
    const panel = page.getByRole('tabpanel', { name: ar.teachers.tabStudents });
    await expect(panel.getByText(`1 ${E.trial} · 1 ${E.active} · 1 ${E.paused}`)).toBeVisible();
    await expect(panel.getByRole('link', { name: names.active })).toBeVisible();
    await expect(panel.getByRole('link', { name: names.trial })).toBeVisible();
    await expect(panel.getByRole('link', { name: names.paused })).toHaveCount(0);

    await panel.getByRole('button', { name: ar.teachers.studentsShowAll }).click();
    await expect(panel.getByRole('link', { name: names.paused })).toBeVisible();

    await panel.getByRole('link', { name: ar.teachers.studentsViewAll }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/students\\?teacher=${teacherId}`));
    await expectNames(page, [names.active, names.trial, names.paused], [names.unassigned]);
  });
});
