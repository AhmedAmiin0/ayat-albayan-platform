import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { bookingBodySchema } from '@/modules/teaching/booking/plan/package-size';
import type { CourseDraft } from './course-draft.rules';

/** A stored row: the request is re-parsed as a booking body on every read (rule 12). */
const rowSchema = z.object({
  subscription_id: z.uuid(),
  request: bookingBodySchema,
  saved_by: z.uuid(),
  saved_at: z.string(),
});

/**
 * subscription_course_drafts (migration 20261106000200; service role only): one draft per package,
 * and whether the package is held (unpaid with an open payment link) or active.
 */
@Injectable()
export class CourseDraftRepo {
  private readonly log = new Logger(CourseDraftRepo.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  /** The package's draft; null without one (or a row that no longer parses, logged). */
  async get(subscriptionId: string): Promise<CourseDraft | null> {
    const { data, error } = await this.db
      .from('subscription_course_drafts')
      .select('subscription_id, request, saved_by, saved_at')
      .eq('subscription_id', subscriptionId)
      .maybeSingle();
    if (error) throw dbError(error);
    const row = rowSchema.safeParse(data);
    if (data && !row.success) this.log.warn(`course draft ${subscriptionId} does not parse`);
    return row.success ? toDraft(row.data) : null;
  }

  /** Saves (or replaces: an edit) the draft; its new saved_at. */
  async save(input: Omit<CourseDraft, 'savedAt'>): Promise<string> {
    const savedAt = new Date().toISOString();
    const row = {
      subscription_id: input.subscriptionId,
      request: input.request,
      saved_by: input.savedBy,
      saved_at: savedAt,
    };
    const { error } = await this.db
      .from('subscription_course_drafts')
      .upsert(row, { onConflict: 'subscription_id' });
    if (error) throw dbError(error);
    return savedAt;
  }

  async remove(subscriptionId: string): Promise<void> {
    const { error } = await this.db.from('subscription_course_drafts').delete().eq('subscription_id', subscriptionId);
    if (error) throw dbError(error);
  }

  /** Hold mode: the package is unpaid AND one of its payment links is still open. */
  async held(subscriptionId: string, now = new Date()): Promise<boolean> {
    const [status, links] = await Promise.all([
      this.status(subscriptionId),
      this.db
        .from('payment_links')
        .select('id')
        .eq('subscription_id', subscriptionId)
        .eq('status', 'open')
        .gt('expires_at', now.toISOString())
        .limit(1),
    ]);
    if (links.error) throw dbError(links.error);
    return status === 'unpaid' && links.data.length > 0;
  }

  /** The package's status (null when unknown). */
  async status(subscriptionId: string): Promise<string | null> {
    const { data, error } = await this.db.from('subscriptions').select('status').eq('id', subscriptionId).maybeSingle();
    if (error) throw dbError(error);
    return data?.status ?? null;
  }
}

const toDraft = (r: z.output<typeof rowSchema>): CourseDraft => ({
  subscriptionId: r.subscription_id,
  request: r.request,
  savedBy: r.saved_by,
  savedAt: r.saved_at,
});
