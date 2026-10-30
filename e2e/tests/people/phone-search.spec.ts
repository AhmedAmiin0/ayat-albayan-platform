import type { Page } from '@playwright/test';
import { bearer, API } from '../../support/messages';
import { dropPeople, people, seedPeople, type Kind, type Person } from '../../support/people/admin-extra-phone';
import { ar, expect, test } from '../../support/core/fixtures';

// A14, phone search (searchDigits): the list endpoints of inbox, leads, students, job applicants
// and teachers find a person by a local 05…, 00966…, +966 with spaces, partial Arabic digits or
// mixed digits; fewer than 3 digits fall back to the name. Only the inbox, leads and students
// pages have a search box: job applicants and teachers are covered at the API (their pages have none).

const STAMP = String(Date.now()).slice(-6);
const LIST = people(STAMP);
const state = { teacherId: '' };

const arabic = (s: string) => s.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.charAt(Number(d)));
const person = (kind: Kind): Person => LIST.find((p) => p.kind === kind) ?? (LIST[0] as Person);

function variants(p: Person): Record<string, string> {
  const n = p.national;
  const local = `0${n}`;
  return {
    local,
    '00 prefix': `00966${n}`,
    'plus with spaces': `+966 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`,
    'partial Arabic digits': arabic(n.slice(0, 8)),
    'mixed digits': `${arabic(local.slice(0, 3))} ${local.slice(3)}`,
  };
}

const ENDPOINT: Record<Kind, string> = {
  guardian: '/students?search=',
  lead: '/leads?q=',
  applicant: '/job-applicants?q=',
  teacher: '/teachers?search=',
};

async function found(page: Page, path: string): Promise<{ total: number; text: string }> {
  const res = await page.request.get(`${API}${path}&pageSize=100`, { headers: await bearer(page) });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { total: number; items: unknown[] };
  return { total: body.total, text: JSON.stringify(body.items) };
}

test.describe('phone search (searchDigits)', () => {
  test.beforeAll(async () => {
    state.teacherId = await seedPeople(LIST);
  });
  test.afterAll(async () => {
    await dropPeople(LIST, state.teacherId);
  });

  test('API: every number format finds exactly its own person; two digits fall back to the name', async ({ asRole }, info) => {
    test.skip(info.project.name === 'mobile', 'pure API checks run once, on desktop');
    const page = await asRole('admin');
    await page.goto('/admin');
    const all = [...(['guardian', 'lead', 'applicant', 'teacher'] as const).map((k) => [ENDPOINT[k], person(k)] as const), ['/threads?search=', person('lead')] as const];
    for (const [path, p] of all) {
      for (const [label, term] of Object.entries(variants(p))) {
        const r = await found(page, `${path}${encodeURIComponent(term)}`);
        expect([path, label, r.total]).toEqual([path, label, 1]);
        expect(r.text).toContain(p.kind === 'guardian' ? `طالب ${p.name}` : p.national);
      }
      expect((await found(page, `${path}77`)).text).toContain(p.name);
    }
  });

  test('inbox, leads and students boxes: Arabic digits, 00 and + prefixes, partial and name', async ({ asRole }) => {
    // 18 page loads: ~20 s on a fresh DB, near 30 s once a full two-project run has filled it.
    test.setTimeout(90_000);
    const page = await asRole('admin');
    const boxes = [
      { url: '/admin/inbox', role: 'searchbox', who: person('lead') },
      { url: '/admin/leads', role: 'searchbox', who: person('lead') },
      { url: '/admin/students', role: 'textbox', who: person('guardian') },
    ] as const;
    for (const box of boxes) {
      const terms = { ...variants(box.who), name: box.who.name, 'two digits': '77' };
      for (const [label, term] of Object.entries(terms)) {
        await page.goto(box.url);
        const input = page.getByRole(box.role, { name: ar.common.search, exact: true });
        await input.fill(term);
        await input.press('Enter');
        const shown = box.url.endsWith('students') ? `طالب ${box.who.name}` : box.who.name;
        await expect(page.getByText(shown).first(), `${box.url} by ${label}`).toBeVisible();
      }
    }
  });
});
