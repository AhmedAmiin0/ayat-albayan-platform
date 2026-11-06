import type { ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { Page } from '@/common/http/http';
import { SalesThreadsService } from '@/modules/messaging/inbox/sales-threads/sales-threads.service';
import { TeacherThreadsService } from '@/modules/messaging/inbox/teacher-threads/teacher-threads.service';
import type { ThreadListFilter } from '@/modules/messaging/inbox/threads/threads.repo';
import { ThreadsService } from '@/modules/messaging/inbox/threads/threads.service';
import type { DeltaCaller } from './thread-delta.service';

type Kind = DeltaCaller['kind'];
type Lister = (f: ThreadListFilter, caller: DeltaCaller) => Promise<Page<ThreadView>>;

/**
 * The list rows of the chats a sync page touched, each exactly as that caller's GET /threads row
 * (the admin's, sales' redacted one, a teacher's own unread count): one list read, `phones` only.
 */
@Injectable()
export class SyncThreads {
  private readonly listers: Record<Kind, Lister>;

  constructor(admin: ThreadsService, sales: SalesThreadsService, teacher: TeacherThreadsService) {
    this.listers = {
      admin: (f) => admin.list(f),
      sales: (f) => sales.list(f),
      teacher: (f, c) => teacher.list(f, c.kind === 'teacher' ? narrowed(c, f) : never()),
    };
  }

  async of(input: {
    phones: readonly string[];
    hide: readonly string[];
    caller: DeltaCaller;
  }): Promise<ThreadView[]> {
    const phones = [...new Set(input.phones)];
    if (phones.length === 0) return [];
    const hide = input.hide.length > 0 ? { hide: input.hide } : {};
    const f: ThreadListFilter = { page: 1, pageSize: phones.length, phones, ...hide };
    return (await this.listers[input.caller.kind](f, input.caller)).items;
  }
}

/** A teacher's list is her scope's phones: narrowed to the touched ones (all already inside it). */
const narrowed = (c: Extract<DeltaCaller, { kind: 'teacher' }>, f: ThreadListFilter) => ({
  ...c.scope,
  phones: new Set((f.phones ?? []).filter((p) => c.scope.phones.has(p))),
});

const never = (): never => {
  throw new Error('sync threads: caller kind mismatch');
};
