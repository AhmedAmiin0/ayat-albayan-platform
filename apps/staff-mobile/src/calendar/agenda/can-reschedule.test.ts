import { pending } from '@/today/testing/fixtures';
import { canReschedule } from './can-reschedule';

test('only when the API offered `reschedule` and the status still allows it', () => {
  expect(canReschedule(pending)).toBe(true);
  expect(canReschedule({ ...pending, allowed_events: ['confirm'] })).toBe(false);
  expect(canReschedule({ ...pending, status: 'completed' })).toBe(false);
});
