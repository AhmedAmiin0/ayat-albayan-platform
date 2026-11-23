import { fillSlots, notOpenedCount, usageText } from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { counted } from '@ab/core';
import type { ReactNode } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useLinkDates } from '@/features/platform/short-links/shared/use-link-dates';

const D = t.shortLinks.detail;

function Stat({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="grid content-start gap-2 rounded-md border border-rule p-4">
      <span className="text-xs text-ink-3">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {children}
    </div>
  );
}

/** «7 من 12» over a bar of the limit used (no bar without a limit). */
function VisitorsStat({ link }: { link: ShortLinkDetail }) {
  const max = link.maxUsers;
  const used = max === null ? 0 : Math.min(100, Math.round((link.visitors / max) * 100));
  return (
    <Stat label={D.visitors} value={usageText(link, t.shortLinks.list)}>
      {max !== null && (
        <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-sunk">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${used}%` }} />
        </span>
      )}
    </Stat>
  );
}

function UsersStat({ link }: { link: ShortLinkDetail }) {
  const waiting = notOpenedCount(link);
  const value = link.users > 0 ? String(link.users) : t.shortLinks.audience.anyone;
  return (
    <Stat label={D.users} value={value}>
      {waiting > 0 && (
        <a
          href="#link-users"
          className="text-xs font-semibold text-lapis underline underline-offset-4"
        >
          {counted(D.notOpened, waiting)}
        </a>
      )}
    </Stat>
  );
}

function RemainingStat({ link }: { link: ShortLinkDetail }) {
  const dates = useLinkDates();
  const { parts, text } = dates.expiry(link);
  const value = parts.kind === 'in_days' ? counted(t.shortLinks.form.days, parts.days) : text;
  return (
    <Stat label={D.remaining} value={value}>
      <span className="text-xs text-ink-3">
        {fillSlots(D.until, { date: dates.weekday(link.expiresAt) })}
      </span>
    </Stat>
  );
}

/** «الزوار», «المستخدمون», «المتبقي» (board LinkXWebDetail). */
export function StatCards({ link }: { link: ShortLinkDetail }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <VisitorsStat link={link} />
      <UsersStat link={link} />
      <RemainingStat link={link} />
    </div>
  );
}
