import { seedConfig } from './platform/config-seed';
import { resetDb, seedFxRate, seedSettings, seedTeacherRow, seedUser } from './core/db';
import { USERS } from './core/users';

/** Clean DB, default settings, seeder metadata (docs/26 §2b) and one account per role. */
export default async function globalSetup(): Promise<void> {
  await resetDb();
  await seedFxRate();
  await seedSettings();
  await seedConfig();
  for (const user of Object.values(USERS)) {
    const id = await seedUser(user);
    if (user.role === 'teacher') await seedTeacherRow(id, user.fullName);
  }
}
