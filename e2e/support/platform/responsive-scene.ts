import type { Browser } from '@playwright/test';
import { ar } from '../core/fixtures';
import { AR_LOCALE } from '../core/locale';
import { gotoLoaded } from '../core/page-loaded';
import { forgetProfileLocale } from '../core/profile-locale';
import { resetAbrar, seedFamily, seedLesson } from '../core/schedule';
import { authFile, USERS } from '../core/users';
import { stubInbound, stubReset } from '../core/wa-stub';
import type { ResponsiveScene } from './responsive-scene.types';

const HOUR_MS = 3_600_000;

/** A family with a long name, a lesson in an hour, an inbound chat and the student's join link. */
export async function seedResponsiveScene(browser: Browser): Promise<ResponsiveScene> {
  await stubReset();
  const teacherId = await resetAbrar();
  const family = await seedFamily('أم سارة عبد الرحمن الطويلة', ['سارة عبد الرحمن', 'يوسف']);
  const studentId = family.studentIds[0] ?? '';
  const startsAt = new Date(Date.now() + HOUR_MS);
  await seedLesson({ teacherId, studentId, startsAt, minutes: 30 });
  const digits = `9665${String(Date.now()).slice(-8)}`;
  const guardian = `أم مريم ${digits.slice(-4)}`;
  const text = 'السلام عليكم، أريد الاشتراك لابنتي في حلقات الحفظ';
  await stubInbound({ from: digits, name: guardian, text });
  return { studentId, guardian, studentLink: await createStudentLink(browser, studentId) };
}

async function createStudentLink(browser: Browser, studentId: string): Promise<string> {
  await forgetProfileLocale(USERS.admin.email);
  const context = await browser.newContext({ storageState: authFile('admin'), locale: AR_LOCALE });
  try {
    const admin = await context.newPage();
    await gotoLoaded(admin, `/admin/students/${studentId}`);
    await admin.getByRole('button', { name: ar.studentLink.create }).click();
    return new URL(await admin.getByLabel(ar.studentLink.shown).inputValue()).pathname;
  } finally {
    await context.close();
  }
}
