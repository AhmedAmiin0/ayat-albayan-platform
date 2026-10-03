import { formatPhone, type SubscriptionBadge, type ThreadView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/ui/icon';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { threadKind, threadTitle, timesInText } from './format';
import { inboxBase, showsPhone, useInboxMode } from './mode';
import type { InboxSearch } from './search';
import { leadChip } from './subscription';
import { SubscriptionChip } from './SubscriptionChip';

export interface ThreadHeaderProps {
  thread: ThreadView;
  /** The list's URL state without the open thread (the phone-width «رجوع»). */
  listSearch: InboxSearch;
  headingId: string;
  /** The family's subscription (threadBadge); null for a teacher or an unknown number. */
  badge: SubscriptionBadge | null;
}

/** Name, phone, who the number is (lead status chip / guardian / teacher), «مشترك» and the source. */
export function ThreadHeader({ thread: th, listSearch, headingId, badge }: ThreadHeaderProps) {
  const kind = threadKind(th);
  const mode = useInboxMode();
  return (
    <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule pb-3">
      <Link
        to={inboxBase(mode)}
        search={listSearch}
        className="inline-flex min-h-11 items-center gap-1 rounded-md px-1.5 text-sm font-semibold text-lapis shell:hidden"
      >
        <Icon name="chevron-right" />
        {t.common.back}
      </Link>
      <h2 id={headingId} className="min-w-0 font-display text-h3 font-bold">
        {threadTitle(th, mode)}
      </h2>
      {th.display_name && showsPhone(mode) && <Ltr className="text-xs text-ink-3">{formatPhone(th.phone_e164)}</Ltr>}
      <span className="flex flex-wrap items-center gap-2 text-2xs text-ink-3 sm:ms-auto">
        {kind === 'lead' && th.lead_status ? (
          <StatusChip {...leadChip(th.lead_status)} />
        ) : (
          <span className="text-xs font-semibold text-ink-2">{kind ? t.inbox.kind[kind] : t.inbox.unknownNumber}</span>
        )}
        {badge && <SubscriptionChip badge={badge} />}
        {mode === 'admin' && th.lead_source && <span>{t.enums.leadSource[th.lead_source]}</span>}
        <span>{timesInText()}</span>
      </span>
    </header>
  );
}
