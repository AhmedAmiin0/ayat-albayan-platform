import { fillSlots, usageText, visitorLook } from '@ab/client-core';
import type { ShortLinkDetail, ShortLinkVisitor } from '@ab/shared';
import { t } from '@ab/web-kit';
import { LinkTable } from '@/features/platform/short-links/shared/LinkTable';
import { PersonLine } from '@/features/platform/short-links/shared/PersonLine';
import { useLinkDates } from '@/features/platform/short-links/shared/use-link-dates';

const D = t.shortLinks.detail;

/** The visitor, how they came in, and the family a verified number belongs to. */
function VisitorCell({ visitor }: { visitor: ShortLinkVisitor }) {
  const look = visitorLook(visitor);
  return (
    <span className="grid gap-0.5">
      <PersonLine look={look} />
      <span className="text-xs text-ink-3">{D.via[look.via]}</span>
      {look.family && (
        <span className="text-xs text-ink-3">{fillSlots(D.family, { name: look.family })}</span>
      )}
    </span>
  );
}

const countText = (link: ShortLinkDetail): string =>
  link.maxUsers === null
    ? usageText(link, t.shortLinks.list)
    : fillSlots(D.visitorsOf, { n: link.visitors, max: link.maxUsers });

/** Each distinct visitor, their last visit and opens. */
export function VisitorsTable({ link }: { link: ShortLinkDetail }) {
  const dates = useLinkDates();
  const rows = link.visitorList.map((v) => [
    <VisitorCell key="who" visitor={v} />,
    <span key="last" className="grid text-xs tabular-nums">
      <span>{dates.day(v.lastAt)}</span>
      <span className="text-ink-3">{dates.clock(v.lastAt)}</span>
    </span>,
    <span key="opens" className="tabular-nums">{v.opens}</span>,
  ]);
  return (
    <LinkTable
      id="link-visitors"
      title={D.visitorLog}
      count={countText(link)}
      hint={link.visitorList.length > 0 ? D.visitorsHint : D.noVisitors}
      head={[D.columns.visitor, D.columns.lastVisit, D.columns.opens]}
      rows={rows}
      keys={link.visitorList.map((v) => `${v.kind}:${v.person?.id ?? v.phone ?? v.firstAt}`)}
    />
  );
}
