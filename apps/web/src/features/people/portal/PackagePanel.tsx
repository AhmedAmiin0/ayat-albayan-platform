import { dateText, subscriptionStatusStyle, type PortalPackage, type PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/display/empty-state';
import { StatusChip } from '@/components/ui/display/status-chip';
import { buttonVariants } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { portalPackageQuery } from './api';
import { LoadState } from './LoadState';

/** A calendar day «YYYY-MM-DD» as the UI writes dates (no zone: it is a day, not an instant). */
const dayText = (day: string): string =>
  dateText(new Date(`${day}T00:00:00Z`), { tz: 'UTC', locale }, { dateStyle: 'medium' });

interface Props {
  student: PortalStudent;
  /** wa.me link to the academy's chat line; the link is hidden without one. */
  renewUrl: string | null;
}

/** «الباقة»: name, lessons left, renewal date and status. No price, payment or invoice. */
export function PackagePanel({ student, renewUrl }: Props) {
  const query = useQuery(portalPackageQuery(student.id));
  const renew = renewUrl && (
    <a href={renewUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'secondary' })}>
      {t.portal.renew}
    </a>
  );
  return (
    <LoadState query={query}>
      {({ package: pkg }) =>
        pkg ? (
          <PackageCard pkg={pkg} renew={renew} />
        ) : (
          <EmptyState title={t.portal.packageEmpty} action={renew}>
            {t.portal.packageEmptyHint}
          </EmptyState>
        )
      }
    </LoadState>
  );
}

function PackageCard({ pkg, renew }: { pkg: PortalPackage; renew: ReactNode }) {
  const name = pkg.package ? t.enums.packageSize[pkg.package] : t.portal.packageTab;
  const facts: [string, string][] = [
    [t.portal.lessonsTotal, String(pkg.lessons_total)],
    [t.portal.lessonLength, t.portal.minutes.replace('{n}', String(pkg.duration))],
    [t.portal.startsOn, dayText(pkg.starts_on)],
    ...(pkg.renews_on ? [[t.portal.renewsOn, dayText(pkg.renews_on)] as [string, string]] : []),
  ];
  return (
    <section className="grid gap-4 rounded-lg border border-rule bg-raised p-4" aria-label={t.portal.packageTab}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-h3 font-bold">{name}</h2>
        <StatusChip {...subscriptionStatusStyle[pkg.status]} label={t.portal.packageStatus[pkg.status]} />
      </div>
      <p className="grid gap-0.5">
        <span className="text-sm text-ink-2">{t.portal.remaining}</span>
        <span className="font-display text-h2 font-bold tabular-nums">{pkg.remaining}</span>
        <span className="text-xs text-ink-3">{t.portal.remainingHint}</span>
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="grid gap-0.5">
            <dt className="text-ink-3">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {renew}
    </section>
  );
}
