// Test doubles for presence (test-only, excluded from the build by *.fakes.ts).
import { vi } from 'vitest';
import type { ChannelPerson, StaffRow } from './presence.repo';

export const SEEN = '2026-10-30T09:00:00.000Z';

/** The student's channel: teacher p-t1, guardian p-g, own-contact student p-s. */
export const CHANNEL_PEOPLE: ChannelPerson[] = [
  { profile_id: 'p-t1', role: 'teacher' },
  { profile_id: 'p-g', role: 'guardian' },
  { profile_id: 'p-s', role: 'student' },
];

export const STAFF: StaffRow[] = [
  { id: 'p-ad', full_name: 'المدير', role: 'admin' },
  { id: 'p-t1', full_name: 'أبرار', role: 'teacher' },
  { id: 'p-sa', full_name: 'سارة', role: 'sales' },
];

/** PresenceRepo and PresenceSettings fakes: everyone seen at SEEN except p-sa (never). */
export function fakePresence() {
  const repo = {
    touch: vi.fn(async (_ids: readonly string[]) => undefined),
    lastSeen: vi.fn(
      async (ids: readonly string[]) =>
        new Map(ids.filter((i) => i !== 'p-sa').map((i) => [i, SEEN])),
    ),
    channelPeople: vi.fn(async (studentId: string) => (studentId ? CHANNEL_PEOPLE : [])),
    staff: vi.fn(async () => STAFF),
  };
  const settings = { enabled: vi.fn(async () => true) };
  return { repo, settings };
}
