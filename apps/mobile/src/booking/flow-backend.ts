import type { Lead } from '@/inbox/types';
import { huda, unnamed } from '@/inbox/fixtures';
import { FakeBackend } from '@/test/fake-backend';
import { booked, SUN_17 } from './fixtures';
import { fakeBookingApi } from './test-utils';

// The leads + booking API for the lead → quick-book flow. POST /booking moves the lead to
// trial_booked, like the API's lead funnel does, so a refetch shows the truth.

export function bookingBackend() {
  const state: { leads: Lead[] } = { leads: [huda, unnamed] };
  const booking = fakeBookingApi();
  const backend = new FakeBackend()
    .on('GET /leads', ({ query }) => {
      const items = state.leads.filter((l) => !query['status'] || l.status === query['status']);
      return { items, total: items.length, page: 1, pageSize: 25 };
    })
    .on('GET /settings', () => ({}))
    .on('GET /booking/teachers', ({ path }) => booking.fetch(path))
    .on('GET /booking/slots', ({ path }) => booking.fetch(path))
    .on('POST /booking', () => {
      state.leads = state.leads.map((l) => (l.id === huda.id ? { ...l, status: 'trial_booked' } : l));
      return booked(SUN_17);
    });
  return { backend, state, slots: booking.api };
}
