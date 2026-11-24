import { MAINTENANCE_CONFIRM_MS, probe, type MaintenanceProbes } from '@ab/client-core';
import { PUBLIC_CONFIG_PATH } from '@ab/settings';
import { z } from 'zod';
import { env } from '../lib/http/env';

/** The two hosts the probes ask (rule 12: the build's public config parsed, never trusted). */
const Hosts = z.object({ apiUrl: z.string().min(1), supabaseUrl: z.string().min(1) });
const hosts = Hosts.parse(env);

const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

/** The phone reaches the internet when Supabase's host answers at all (any status counts). */
const deviceOnline = async (): Promise<boolean> => (await probe(hosts.supabaseUrl)) !== null;

/** The phone's side of maintenanceFacts: the public settings, the device, the 2 s pause. */
export const phoneProbes: MaintenanceProbes = {
  api: () => probe(`${hosts.apiUrl}${PUBLIC_CONFIG_PATH}`),
  deviceOnline,
  pause: () => wait(MAINTENANCE_CONFIRM_MS),
};
