import type { QueryClient } from '@tanstack/react-query';
import { MONEY_KEY } from '@/features/finance/subscriptions';
import { STUDENTS_KEY } from '@/features/people/students';
import { LESSONS_KEY } from '@/features/teaching/schedule';

// A booking creates lessons, may create the student, and opens a package with its balance.
const BOOKED_ROOTS = [LESSONS_KEY, STUDENTS_KEY, MONEY_KEY];

export async function refreshBooked(client: QueryClient): Promise<void> {
  await Promise.all(BOOKED_ROOTS.map((queryKey) => client.invalidateQueries({ queryKey })));
}
