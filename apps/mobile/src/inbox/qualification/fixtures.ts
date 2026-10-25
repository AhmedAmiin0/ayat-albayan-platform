import { ApiError } from '@/core/lib/http/api';
import { huda, page } from '../shared/fixtures';
import type { LeadProfile } from './queries';

// Test rows in the GET /leads shape (every column the profile reads).

export const QUALIFICATION = {
  student_name: 'سهيلة',
  age: 9,
  gender: 'female',
  tz: 'Asia/Riyadh',
  available_days: [4, 0],
  preferred_from: '16:00',
  preferred_to: '18:00',
};

export const hudaProfile: LeadProfile = {
  ...huda,
  status: 'no_reply',
  qualification: QUALIFICATION,
  follow_up_paused: false,
  follow_up_paused_by: null,
  follow_up_stage: 1,
  next_follow_up_at: '2026-10-04T14:00:00Z',
  follow_up_note: null,
};

/** settings.follow_up_hours: three follow-ups. */
export const FOLLOW_UP_HOURS = [24, 72, 168];

/** GET /leads?q=… (the exact-phone read) and GET /settings, as the lead screen asks for them. */
export function answer(row: LeadProfile | null) {
  return async (path: string) => {
    if (path.startsWith('/leads?')) return page(row ? [row] : []);
    if (path === '/settings') return { follow_up_hours: FOLLOW_UP_HOURS };
    throw new ApiError(404);
  };
}

/** React Native's fetch with no network at all (payment-errors isOffline). */
export const noNetwork = () => new TypeError('Network request failed');
