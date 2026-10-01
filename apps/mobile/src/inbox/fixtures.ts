import type { Page } from '@/lib/paging';
import type { Lead } from './types';

// Test rows in the GET /leads shape.

export const huda: Lead = {
  id: 'a1',
  phone_e164: '+966552147730',
  name: 'هدى سالم',
  source: 'facebook_ad',
  status: 'new',
  created_at: '2026-09-28T09:00:00Z',
  last_inbound_at: '2026-10-01T08:00:00Z',
};

export const unnamed: Lead = {
  id: 'b2',
  phone_e164: '+201012345678',
  name: null,
  source: 'whatsapp_direct',
  status: 'contacted',
  created_at: '2026-09-30T09:00:00Z',
  last_inbound_at: null,
};

export function page(items: Lead[], total = items.length): Page<Lead> {
  return { items, total, page: 1, pageSize: 25 };
}

/** An infinite-query cache entry, as usePagedList stores it. */
export function cachedList(items: Lead[]) {
  return { pages: [page(items)], pageParams: [1] };
}
