import { MAINTENANCE_CONFIRM_MS, probe, type MaintenanceProbes } from '@ab/client-core';
import { PUBLIC_CONFIG_PATH } from '@ab/settings';
import { env } from '@ab/web-kit/lib/http/env';

const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

/** The browser says online and Supabase's host answers at all (an opaque no-cors reply counts). */
async function deviceOnline(): Promise<boolean> {
  if (!navigator.onLine) return false;
  return (await probe(`${env.supabaseUrl}/auth/v1/health`, { mode: 'no-cors' })) !== null;
}

/** The browser's side of maintenanceFacts: the public settings, the device, the 2 s pause. */
export const webProbes: MaintenanceProbes = {
  api: () => probe(`${env.apiUrl}${PUBLIC_CONFIG_PATH}`),
  deviceOnline,
  pause: () => wait(MAINTENANCE_CONFIRM_MS),
};
