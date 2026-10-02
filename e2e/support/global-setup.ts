import { resetDb, seedFxRate, seedSettings, seedTeacherRow, seedUser } from './db';
import { USERS } from './users';

/**
 * Clean DB + default settings + one account per role before the run; the teacher account owns a
 * teachers row (abrar@e2e.local → «أبرار»). Journeys add their own data.
 */
export default async function globalSetup(): Promise<void> {
  await resetDb();
  await seedFxRate();
  await seedSettings();
  for (const user of Object.values(USERS)) {
    const id = await seedUser(user);
    if (user.role === 'teacher') await seedTeacherRow(id, user.fullName);
  }
}
