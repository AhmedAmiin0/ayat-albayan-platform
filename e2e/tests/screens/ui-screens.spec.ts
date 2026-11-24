import type { Browser } from '@playwright/test';
import { expect, test } from '../../support/core/fixtures';
import { FAMILY_URL } from '../../support/core/family-host';
import { stubReset } from '../../support/core/wa-stub';
import { closeCodes, family as bareFamily, openCodes } from '../../support/people/family-sign-in';
import { runPass } from '../../support/screens/pass';
import { EMPTY, ENGLISH, VARIANTS } from '../../support/screens/plan';
import { readSeed, writeIndex, writePart, writeSeed } from '../../support/screens/run-state';
import { familyLocale, seedDemo, seededRows, seedExtraRoles } from '../../support/screens/seed';
import { guardianState, staffState, studentState } from '../../support/screens/sessions';
import { emptyTargetsOf, targetsOf } from '../../support/screens/targets';
import type { App, Job, Role, Skipped, StaffRole } from '../../support/screens/screens.types';
import { seedStoreFamily } from '../../support/store/store-family';

// Every page of both web apps as every role that reaches it, on demo data in the local Supabase
// that .github/workflows/ui-screens.yml starts: UI_SHOTS=1 only. Output: e2e/ui-screens/.

const STAFF_ROLES: StaffRole[] = ['admin', 'sales', 'teacher', 'assistant'];
const staffBase = (): string => test.info().project.use.baseURL ?? '';

function job(browser: Browser, input: Pick<Job, 'app' | 'role' | 'base' | 'state'>): Job {
  return { browser, entries: [], ...input };
}

async function pass(j: Job, input: { name: string; empty?: boolean; signedOut?: boolean }) {
  const skipped: Skipped[] = [];
  const signedOut = input.signedOut ?? false;
  const targets = input.empty
    ? emptyTargetsOf(j.app)
    : targetsOf(j.app, { seeded: readSeed().seeded, signedOut });
  const variants = input.empty ? [EMPTY] : VARIANTS;
  await runPass(j, { targets, variants, skipped, dialogs: !input.empty });
  writePart(input.name, { entries: j.entries, skipped });
  expect(j.entries.length, `${input.name}: shots taken`).toBeGreaterThan(0);
}

test.describe('ui screens', () => {
  test.skip(process.env.UI_SHOTS !== '1', 'UI screenshots only: UI_SHOTS=1');
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'one run: each variant is its own context');
    test.setTimeout(30 * 60_000);
    await stubReset();
    await openCodes();
  });
  test.afterEach(closeCodes);
  test.afterAll(writeIndex);

  test('empty states, staff roles', async ({ browser }) => {
    await seedExtraRoles();
    for (const role of STAFF_ROLES) {
      const state = await staffState(browser, { base: staffBase(), role });
      const j = job(browser, { app: 'staff', role, base: staffBase(), state });
      await pass(j, { name: `empty-staff-${role}`, empty: true });
    }
  });

  test('empty states, a guardian with one new child', async ({ browser }) => {
    const bare = await bareFamily();
    const state = await guardianState(browser, bare.phone);
    const j = job(browser, { app: 'family', role: 'guardian', base: FAMILY_URL, state });
    await pass(j, { name: 'empty-family-guardian', empty: true });
  });

  test('demo data', async () => {
    seedDemo();
    const family = await seedStoreFamily();
    writeSeed({ family, seeded: await seededRows(family) });
  });

  for (const role of STAFF_ROLES) {
    test(`staff web as ${role}`, async ({ browser }) => {
      const state = await staffState(browser, { base: staffBase(), role });
      const j = job(browser, { app: 'staff', role, base: staffBase(), state });
      await pass(j, { name: `staff-${role}` });
    });
  }

  for (const app of ['staff', 'family'] as const satisfies App[]) {
    test(`${app} web signed out`, async ({ browser }) => {
      const base = app === 'staff' ? staffBase() : FAMILY_URL;
      const j = job(browser, { app, role: 'public', base });
      await pass(j, { name: `${app}-public`, signedOut: true });
    });
  }

  test('family web as guardian and student, Arabic then English', async ({ browser }) => {
    const { family } = readSeed();
    const states: [Role, Awaited<ReturnType<typeof guardianState>>][] = [
      ['guardian', await guardianState(browser, family.phone)],
      ['student', await studentState(browser, family)],
    ];
    for (const [role, state] of states) {
      await pass(job(browser, { app: 'family', role, base: FAMILY_URL, state }), {
        name: `family-${role}`,
      });
    }
    await familyLocale('en');
    for (const [role, state] of states) {
      const j = job(browser, { app: 'family', role, base: FAMILY_URL, state });
      const targets = targetsOf('family', { seeded: readSeed().seeded, signedOut: false });
      const skipped: Skipped[] = [];
      await runPass(j, { targets, variants: [ENGLISH], skipped, dialogs: false });
      writePart(`family-${role}-en`, { entries: j.entries, skipped });
    }
    await familyLocale(null);
  });
});
