import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChannelEditsRepo } from '@/modules/teaching/student-channels/channel-edits.repo';
import { ChannelPeopleRepo } from '@/modules/teaching/student-channels/channel-people.repo';
import type { ChannelMessageRow } from '@/modules/teaching/student-channels/channel.repo';
import { ChannelMedia } from '@/modules/teaching/student-channels/media/channel-media.service';
import {
  ChannelReadState,
  type ChannelViewer,
  type PageReads,
} from '@/modules/teaching/student-channels/reads/channel-read-state';
import type { ViewContext } from './message-view';

const paths = (rows: readonly ChannelMessageRow[]): string[] =>
  rows.flatMap((r) => (r.attachment_path && !r.deleted_at ? [r.attachment_path] : []));

const quoted = (rows: readonly ChannelMessageRow[]): string[] =>
  rows.flatMap((r) => (r.reply_to_id ? [r.reply_to_id] : []));

/** A page's context: a message's and the page's read state (the header's people, my mark). */
export type PageViewContext = ViewContext & Omit<PageReads, 'readByAll'>;

const noReads = (): PageReads => ({ readByAll: new Set(), participants: [], myLastReadAt: null });

const senders = (rows: readonly ChannelMessageRow[]): string[] =>
  rows.flatMap((r) => (r.sender_profile_id ? [r.sender_profile_id] : []));

/**
 * What the views of some rows need: the senders' names, 1 h links to their files, which quotes
 * were deleted since, and ✓✓ on the viewer's own. Links and ticks are extras: a failure there
 * logs and the messages still show (no link, no ✓✓).
 */
@Injectable()
export class ChannelViews {
  private readonly log = new Logger(ChannelViews.name);

  constructor(
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
    @Inject(ChannelMedia) private readonly media: ChannelMedia,
    @Inject(ChannelReadState) private readonly reads: ChannelReadState,
    @Inject(ChannelEditsRepo) private readonly messages: ChannelEditsRepo,
  ) {}

  async context(rows: readonly ChannelMessageRow[], viewer: ChannelViewer): Promise<ViewContext> {
    const [base, readByAll] = await Promise.all([
      this.base(rows, viewer),
      this.reads.byAll(viewer, rows).catch((e: unknown) => this.none('read ticks', e)),
    ]);
    return { ...base, readByAll };
  }

  /** A page's: as context, plus the chat's people and my read mark (none when that fails). */
  async page(rows: readonly ChannelMessageRow[], viewer: ChannelViewer): Promise<PageViewContext> {
    const [base, reads] = await Promise.all([
      this.base(rows, viewer),
      this.reads.page(viewer, rows).catch((e: unknown) => {
        this.warn('read state', e);
        return noReads();
      }),
    ]);
    return { ...base, ...reads };
  }

  private async base(rows: readonly ChannelMessageRow[], viewer: ChannelViewer) {
    const [names, urls, goneQuotes] = await Promise.all([
      this.people.names(senders(rows)),
      this.media.urls(paths(rows)),
      this.messages.deletedIds(quoted(rows)),
    ]);
    return { me: viewer.profileId, names, urls, goneQuotes };
  }

  /** One message just sent or changed: never fails (a lookup failure shows less, not a 500). */
  async safeContext(row: ChannelMessageRow, viewer: ChannelViewer): Promise<ViewContext> {
    try {
      return await this.context([row], viewer);
    } catch (e) {
      this.warn('message view', e);
      return { me: viewer.profileId, names: new Map<string, string>() };
    }
  }

  private none(what: string, e: unknown): Set<string> {
    this.warn(what, e);
    return new Set<string>();
  }

  private warn(what: string, e: unknown): void {
    this.log.warn(`channel ${what} failed: ${String(e)}`);
  }
}
