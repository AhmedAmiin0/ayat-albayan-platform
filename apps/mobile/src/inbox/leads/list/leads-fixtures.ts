import type { SalesPersonView } from '@ab/shared';
import type { Page } from '@/core/lib/query/paging';
import { huda, unnamed } from '../../shared/fixtures';
import type { Lead } from '../../shared/types';

// Test rows for the leads / sales endpoints the parity screens read.

export const sara: SalesPersonView = { id: 'p1', name: 'سارة', open_leads: 2 };
export const omar: SalesPersonView = { id: 'p2', name: 'عمر', open_leads: 0 };

export const owned: Lead = { ...huda, assigned_to: sara.id, assigned_to_name: sara.name };
export const free: Lead = { ...unnamed, assigned_to: null, assigned_to_name: null };

const leadsPage = (items: Lead[]): Page<Lead> => ({ items, total: items.length, page: 1, pageSize: 25 });

/** An apiFetch mock: /auth/me grants `permissions`, /sales/people lists the salespeople, /leads the rows. */
export function leadsBackend(permissions: string[], items: Lead[] = [owned, free]) {
  return (path: string): Promise<unknown> => {
    if (path.startsWith('/auth/me')) return Promise.resolve({ permissions });
    if (path.startsWith('/sales/people')) return Promise.resolve([sara, omar]);
    if (path.startsWith('/leads')) return Promise.resolve(leadsPage(items));
    return Promise.reject(new Error(`unmocked ${path}`));
  };
}
