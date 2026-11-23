import type { LeadView, SalesPersonView } from '@ab/shared';
import type { Page } from '@ab/core';
import { huda, unnamed } from '@/inbox/shared/fixtures';

// Test rows for the leads / sales endpoints the parity screens read.

const sara: SalesPersonView = { id: 'p1', name: 'سارة', open_leads: 2 };
const omar: SalesPersonView = { id: 'p2', name: 'عمر', open_leads: 0 };

export const owned: LeadView = { ...huda, assigned_to: sara.id, assigned_to_name: sara.name };
export const free: LeadView = { ...unnamed, assigned_to: null, assigned_to_name: null };

const leadsPage = (items: LeadView[]): Page<LeadView> => ({ items, total: items.length, page: 1, pageSize: 25 });

/** An apiFetch mock: /auth/me grants `permissions`, /sales/people lists the salespeople, /leads the rows. */
export function leadsBackend(permissions: string[], items: LeadView[] = [owned, free]) {
  return (path: string): Promise<unknown> => {
    if (path.startsWith('/auth/me')) return Promise.resolve({ permissions });
    if (path.startsWith('/sales/people')) return Promise.resolve([sara, omar]);
    if (path.startsWith('/leads')) return Promise.resolve(leadsPage(items));
    return Promise.reject(new Error(`unmocked ${path}`));
  };
}
