import type { LeadView } from '@ab/shared';
import type { Page } from '@ab/core';

// Test rows in the GET /leads shape.

export const huda: LeadView = {
  id: 'a1',
  phone_e164: '+966552147730',
  name: 'هدى سالم',
  source: 'facebook_ad',
  status: 'new',
  created_at: '2026-09-28T09:00:00Z',
  last_inbound_at: '2026-10-01T08:00:00Z',
  last_outbound_at: null,
};

export const unnamed: LeadView = {
  id: 'b2',
  phone_e164: '+201012345678',
  name: null,
  source: 'whatsapp_direct',
  status: 'contacted',
  created_at: '2026-09-30T09:00:00Z',
  last_inbound_at: null,
  last_outbound_at: null,
};

export function page(items: LeadView[], total = items.length): Page<LeadView> {
  return { items, total, page: 1, pageSize: 25 };
}

/** An infinite-query cache entry, as usePagedList stores it. */
export function cachedList(items: LeadView[]) {
  return { pages: [page(items)], pageParams: [1] };
}
