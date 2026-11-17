// ChannelSeatRepo in memory for the HTTP tests (test-only, excluded from the build by *.fakes.ts).
import { vi } from 'vitest';
import type { SeatRow } from './channel-seat.repo';

/** The salespeople by profile id (p-sa brought the student); anyone else reads as no assistant. */
const SALES = new Map([
  ['p-sa', 'سارة'],
  ['p-sb', 'هدى'],
]);

const holderOf = (id: string | null): SeatRow['holder'] =>
  [...SALES].filter(([sid]) => sid === id).map(([sid, name]) => ({ id: sid, name }))[0] ?? null;

/** One seat for every known student: p-sa brought it and holds it until a test says otherwise. */
export function fakeSeats(known: readonly string[]) {
  const seat = { broughtBy: 'p-sa' as string | null, heldBy: 'p-sa' as string | null };
  const repo = {
    read: vi.fn(async (studentId: string): Promise<SeatRow | null> =>
      known.includes(studentId) ? { ...seat, holder: holderOf(seat.heldBy) } : null,
    ),
    take: vi.fn(async (c: { studentId: string; profileId: string; from: string | null }) => {
      if (seat.heldBy === c.from) seat.heldBy = c.profileId;
    }),
    leave: vi.fn(async (c: { studentId: string; profileId: string }) => {
      if (seat.heldBy === c.profileId) seat.heldBy = null;
    }),
  };
  return { seat, repo };
}
