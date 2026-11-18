import { fillSlots, targetHost } from '@ab/client-core';
import { SHORT_LINK_GATE_PATH, type ShortLinkRow } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CopyButton } from '@/features/platform/short-links/shared/CopyButton';
import { LINK_ROUTES, type LinkSection } from '@/features/platform/short-links/shared/link-routes';
import { RoleTag } from '@/features/platform/short-links/shared/PersonLine';
import { useLinkDates } from '@/features/platform/short-links/shared/use-link-dates';

// The list's cells (board LinkXWebList): the title opening the link, the short path with «نسخ»
// and the host it opens, the expiry with its countdown, and the owner with their role.

const L = t.shortLinks.list;

interface RowProps {
  row: ShortLinkRow;
}

export function TitleCell({ row, section }: RowProps & { section: LinkSection }) {
  return (
    <Link
      to={LINK_ROUTES[section].detail}
      params={{ code: row.code }}
      className="inline-flex max-w-[260px] items-center gap-1 font-semibold whitespace-normal text-ink hover:underline"
    >
      {row.title}
      <Icon name="chevron-left" className="shrink-0 text-ink-3" />
    </Link>
  );
}

export function ShortUrlCell({ row }: RowProps) {
  return (
    <span className="grid gap-0.5">
      <span className="inline-flex items-center gap-1">
        <Ltr className="font-semibold">{`${SHORT_LINK_GATE_PATH}${row.code}`}</Ltr>
        <CopyButton text={row.shortUrl} label={`${t.shortLinks.detail.copyLink} ${row.title}`} />
      </span>
      <span className="text-xs text-ink-3">
        {fillSlots(L.opens, { host: targetHost(row.targetUrl) })}
      </span>
    </span>
  );
}

export function ExpiryCell({ row }: RowProps) {
  const dates = useLinkDates();
  const { parts, text } = dates.expiry(row);
  const running = parts.kind !== 'ended' && parts.kind !== 'revoked';
  return (
    <span className="grid gap-0.5">
      {running && <span className="font-semibold">{dates.day(row.expiresAt)}</span>}
      <span className={running ? 'text-xs text-ink-3' : 'text-xs font-semibold text-ink-2'}>
        {text}
      </span>
    </span>
  );
}

export function OwnerCell({ row }: RowProps) {
  const owner = row.createdBy;
  if (owner === null) return <span className="text-ink-3">—</span>;
  return (
    <span className="grid justify-items-start gap-0.5">
      <span>{owner.name}</span>
      <RoleTag role={owner.role} />
    </span>
  );
}
