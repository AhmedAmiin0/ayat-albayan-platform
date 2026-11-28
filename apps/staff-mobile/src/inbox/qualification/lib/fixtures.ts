import type { LeadListItem, LeadRowView } from '@ab/shared';
import { leadListItem, leadRow } from '@ab/shared/testing';
import { ApiError } from '@ab/mobile-kit';
import { SETTING_DEFAULTS } from '@ab/settings';
import { huda, page } from '@/inbox/shared/fixtures';

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

export const hudaProfile: LeadListItem = leadListItem({
  ...huda,
  status: 'no_reply',
  qualification: QUALIFICATION,
  follow_up_stage: 1,
  next_follow_up_at: '2026-10-04T14:00:00Z',
});

/** hudaProfile as the lead writes answer it: the whole leads row. */
export const hudaRow = (patch: Partial<LeadRowView> = {}): LeadRowView =>
  leadRow({
    id: huda.id,
    phone_e164: huda.phone_e164,
    name: huda.name,
    source: huda.source,
    status: 'no_reply',
    qualification: QUALIFICATION,
    follow_up_stage: 1,
    next_follow_up_at: '2026-10-04T14:00:00Z',
    ...patch,
  });

/** settings.follow_up_hours: three follow-ups. */
const FOLLOW_UP_HOURS = [24, 72, 168];

/** GET /leads?q=… (the exact-phone read) and GET /settings, as the lead screen asks for them. */
export function answer(row: LeadListItem | null) {
  return async (path: string) => {
    if (path.startsWith('/leads?')) return page(row ? [row] : []);
    if (path === '/settings') return { ...SETTING_DEFAULTS, follow_up_hours: FOLLOW_UP_HOURS };
    throw new ApiError(404);
  };
}

/** React Native's fetch with no network at all (payment-errors isOffline). */
export const noNetwork = () => new TypeError('Network request failed');
