import type { NotificationAudience, SendGateView } from '@ab/shared';
import { catalogue, settings } from '../shared/fixtures';
import { numbers } from '../numbers/numbers-fixtures';

// GET answers for the «نظرة عامة» tests: settings with the public number, the catalogue, three numbers, a closed gate.

export const PUBLIC_PHONE = '+966566101447';
export const closedGate: SendGateView = { open: false, reason: 'switch_off', queued: 3 };
export const threeNumbers = [...numbers, { ...numbers[0], id: 'num-3', label: 'Spare line', is_default: false }];

export const overviewAnswer = async (path: string): Promise<unknown> => {
  if (path === '/admin/notifications') return catalogue;
  if (path === '/admin/numbers') return threeNumbers;
  if (path === '/admin/communications/parity') return { source: 'legacy', roles: [], differences: [] };
  if (path === '/messages/gate') return closedGate;
  return { ...settings, academy_whatsapp_e164: PUBLIC_PHONE };
};

/** The fixture's automatic rows of one audience, counted by hand (on now / not sent). */
export function handCount(audience: NotificationAudience): { on: number; off: number } {
  const rows = catalogue.entries.filter((e) => !e.manual && e.audience === audience);
  const on = rows.filter((e) => e.state === 'on').length;
  return { on, off: rows.length - on };
}
