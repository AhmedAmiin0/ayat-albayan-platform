import { fillSlots, targetHost, usageText } from '@ab/client-core';
import { SHORT_LINK_GATE_PATH, type ShortLinkRow } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CopyButton } from '@/features/platform/short-links/shared/CopyButton';
import { LINK_ROUTES, type LinkSection } from '@/features/platform/short-links/shared/link-routes';
import { RoleTag } from '@/features/platform/short-links/shared/PersonLine';
import { useLinkDates } from '@/features/platform/short-links/shared/use-link-dates';

const L = t.shortLinks.list;
const TITLE_LINK =
  'inline-flex max-w-[260px] items-center gap-1 font-semibold whitespace-normal text-ink ' +
  'hover:underline';

interface RowProps {
  row: ShortLinkRow;
}

export function TitleCell({ row, section }: RowProps & { section: LinkSection }) {
  return (
    <Link
      to={LINK_ROUTES[section].detail}
      params={{ code: row.code }}
      className={TITLE_LINK}
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

/** Countdown, then the deletion date once ended or revoked. */
export function ExpiryCell({ row }: RowProps) {
  const dates = useLinkDates();
  const { parts, text } = dates.expiry(row);
  const purge = fillSlots(t.shortLinks.expiry.purgeOn, { date: dates.day(parts.purgeAt) });
  return (
    <span className="grid gap-0.5">
      <span className="font-semibold">{dates.day(row.expiresAt)}</span>
      <span className="text-xs text-ink-3">{parts.kind === 'ended' ? purge : text}</span>
    </span>
  );
}

/** Phone cards add a short label since there is no column header there. */
export function UsageCell({ row }: RowProps) {
  return (
    <span className="tabular-nums">
      <span className="text-ink-3 sm:hidden">{`${L.visits} `}</span>
      {usageText(row, L)}
    </span>
  );
}

export function OwnerCell({ row }: RowProps) {
  const owner = row.createdBy;
  if (owner === null) return <span className="text-ink-3">—</span>;
  return (
    <span className="grid justify-items-start gap-0.5">
      <span className="max-sm:hidden">{owner.name}</span>
      <span className="sm:hidden">{fillSlots(L.ownerLine, { name: owner.name })}</span>
      <RoleTag role={owner.role} />
    </span>
  );
}
