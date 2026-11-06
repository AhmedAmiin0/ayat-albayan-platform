import type { MessageView, SyncMessage } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { MessageViews, type ThreadMessageRow } from '@/modules/messaging/whatsapp';
import { withoutLinks } from '@/modules/messaging/inbox/sales-threads/sales-threads';
import { ThreadQuotes } from '@/modules/messaging/inbox/threads/thread-quotes';
import type { DeltaCaller } from './thread-delta.service';

type Kind = DeltaCaller['kind'];

/** Sales' defence in depth (withoutLinks); the others see the view as it is. */
const REDACT: Record<Kind, (v: MessageView) => MessageView> = {
  admin: (v) => v,
  teacher: (v) => v,
  sales: withoutLinks,
};

/** Rows grouped by chat, in page order (a quote is only ever looked up inside its own chat). */
function byPhone(rows: readonly ThreadMessageRow[]): ThreadMessageRow[][] {
  const groups = new Map<string, ThreadMessageRow[]>();
  for (const r of rows) groups.set(r.phone_e164, [...(groups.get(r.phone_e164) ?? []), r]);
  return [...groups.values()];
}

/** The synced rows as the thread page renders them (MessageViews, quotes), plus updated_at. */
@Injectable()
export class SyncViews {
  constructor(
    private readonly views: MessageViews,
    @Optional() @Inject(ThreadQuotes) private readonly quotes?: ThreadQuotes,
  ) {}

  async render(rows: readonly ThreadMessageRow[], kind: Kind): Promise<SyncMessage[]> {
    const groups = await Promise.all(byPhone(rows).map((g) => this.chat(g, kind)));
    return groups.flat();
  }

  private async chat(rows: readonly ThreadMessageRow[], kind: Kind): Promise<SyncMessage[]> {
    const views = await Promise.all(rows.map(async (r) => REDACT[kind](await this.views.view(r))));
    const phone = rows[0]?.phone_e164 ?? '';
    const quoted = this.quotes ? await this.quotes.attach(views, phone) : views;
    return quoted.map((v, i) => ({ ...v, updated_at: rows[i]?.updated_at ?? v.created_at }));
  }
}
