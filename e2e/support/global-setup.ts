import { resetDb, seedUser } from './db';
import { USERS } from './users';

/** Clean DB + one account per role before the run. Journeys add their own data. */
export default async function globalSetup(): Promise<void> {
  await resetDb();
  for (const user of Object.values(USERS)) await seedUser(user);
}
