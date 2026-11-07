import type { ThreadReopenView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { assertCanSend, type TeacherScope } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';
import { messagingWindowOpen } from '@/modules/messaging/inbox/threads/threads.mapper';
import { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';

interface ReopenAsk {
  phone: string;
  /** Teacher mode: the teacher's scope (own families only, like a send). */
  scope: TeacherScope | null;
}

const OPEN: ThreadReopenView = { kapso_reopened: false, template: 'window_open' };
/** Old clients show no note for an outcome they do not know (reopenNoteKey: null). */
const ON_SEND: ThreadReopenView = { kapso_reopened: false, template: 'on_send' };

/**
 * POST /threads/:phone/reopen, answer only (owner 2026-11-07, option 1). Opening a chat sends
 * nothing: an admin opened a closed chat at night and the family got the welcome template. The
 * starter template now goes only when a staff member presses send in a closed window (inbox
 * textLine marks the row AWAITING_REPLY; the sender's WindowHold queues the template once per
 * phone per Riyadh day and holds the message until the family replies). The route stays, with
 * its response shape, because phones keep calling it on open until their OTA update arrives:
 * it never queues a template and never calls Kapso.
 */
@Injectable()
export class ThreadReopenService {
  constructor(private readonly queries: ThreadsRepo) {}

  async reopen(r: ReopenAsk, now = new Date()): Promise<ThreadReopenView> {
    if (r.scope) assertCanSend(r.scope, r.phone);
    const thread = await this.queries.thread(r.phone);
    return thread && messagingWindowOpen(thread, now) ? OPEN : ON_SEND;
  }
}
