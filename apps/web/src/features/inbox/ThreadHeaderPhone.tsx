import { formatPhone } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/ui/icon';
import { iconButtonClass } from '@/components/ui/icon-button';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { threadKind, threadTitle } from './format';
import { inboxBase, showsPhone, useInboxMode } from './mode';
import { leadChip } from './subscription';
import { SubscriptionChip } from './SubscriptionChip';
import type { ThreadHeaderProps } from './ThreadHeader';
import { WindowBanner } from './WindowBanner';

/**
 * The full-screen chat's header on phones (< 640px, owner 2026-10-05): one compact row (back to
 * the list, the initial, name and number, the client sheet's icon button), then the status chips
 * on one line that scrolls sideways instead of wrapping.
 */
export function ThreadHeaderPhone({ thread: th, listSearch, headingId, badge, action }: ThreadHeaderProps) {
  const kind = threadKind(th);
  const mode = useInboxMode();
  const title = threadTitle(th, mode);
  return (
    <header className="shrink-0 border-b border-rule bg-page px-1.5 pb-2">
      <div className="flex items-center gap-1.5">
        <Link to={inboxBase(mode)} search={listSearch} aria-label={t.common.back} className={cn(iconButtonClass, 'text-lapis')}>
          <Icon name="chevron-right" className="size-5" />
        </Link>
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-lapis-wash font-display text-base font-bold text-lapis"
        >
          {title.trim().charAt(0)}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h2 id={headingId} className="truncate font-display text-base font-bold">
            {title}
          </h2>
          {th.display_name && showsPhone(mode) && (
            <Ltr className="block truncate text-2xs text-ink-3">{formatPhone(th.phone_e164)}</Ltr>
          )}
        </div>
        {action}
      </div>
      <div className="-mx-1.5 mt-1 flex items-center gap-1.5 overflow-x-auto px-3 text-2xs whitespace-nowrap text-ink-3 [scrollbar-width:none]">
        {kind === 'lead' && th.lead_status ? (
          <StatusChip size="sm" {...leadChip(th.lead_status)} />
        ) : (
          <span className="font-semibold text-ink-2">{kind ? t.inbox.kind[kind] : t.inbox.unknownNumber}</span>
        )}
        <WindowBanner thread={th} compact />
        {badge && <SubscriptionChip size="sm" badge={badge} />}
        {mode === 'admin' && th.lead_source && <span>{t.enums.leadSource[th.lead_source]}</span>}
      </div>
    </header>
  );
}
