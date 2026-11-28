import type { ThreadLesson, ThreadPeople } from '@ab/shared';
import type { FamilyTag } from '@/modules/messaging/inbox/people/thread-people.mapper';
import type { pageRows } from '@/modules/messaging/inbox/reads/thread-page';

export interface ExtrasInput {
  first: boolean;
  at: Awaited<ReturnType<typeof pageRows>>;
  now: Date;
  threshold: number;
}

/** What the page shows beside its messages (ThreadsService.detail). */
export interface PageExtras {
  people: ThreadPeople;
  lessons: ThreadLesson[];
  tag: FamilyTag | null;
}
