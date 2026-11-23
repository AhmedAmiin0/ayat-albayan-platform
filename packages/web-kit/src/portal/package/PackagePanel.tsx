import { packageSummary, paymentInstructions } from '@ab/client-core';
import { subscriptionStatusStyle, type PortalPackage, type PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalPackageQuery } from '@ab/web-kit/portal/api';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { amountText, dayText, usedOfText } from './package-text';
import { PaymentsList } from './PaymentsList';

/** docs/50 §2: a guardian's or adult student's only; no WhatsApp link. */
export function PackagePanel({ student }: { student: PortalStudent }) {
  const query = useQuery(portalPackageQuery(student.id));
  return (
    <QueryState query={query}>
      {(view) => {
        const instructions = paymentInstructions(view);
        return (
          <div className="grid gap-4">
            {view.package ? (
              <PackageCard pkg={view.package} />
            ) : (
              <EmptyState title={t.portal.packageEmpty}>{t.portal.packageEmptyHint}</EmptyState>
            )}
            <PaymentsList payments={view.payments} />
            {instructions && (
              <section aria-label={t.portal.paymentInstructions} className="grid gap-1">
                <h3 className="text-sm font-semibold text-ink-2">{t.portal.paymentInstructions}</h3>
                <p className="whitespace-pre-line rounded-lg bg-sunk p-3 text-sm">{instructions}</p>
              </section>
            )}
          </div>
        );
      }}
    </QueryState>
  );
}

function PackageCard({ pkg }: { pkg: PortalPackage }) {
  const summary = packageSummary(pkg);
  const name = pkg.package ? t.enums.packageSize[pkg.package] : t.portal.packageTab;
  const facts: [string, string][] = [
    [t.portal.remaining, String(summary.remaining)],
    [t.portal.lessonLength, t.portal.minutes.replace('{n}', String(pkg.duration))],
    [t.portal.startsOn, dayText(pkg.starts_on)],
    ...(summary.renewsOn
      ? [[t.portal.renewsOn, dayText(summary.renewsOn)] as [string, string]]
      : []),
  ];
  return (
    <section className="grid gap-4 rounded-lg border border-rule bg-raised p-4" aria-label={t.portal.packageTab}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-h3 font-bold">{name}</h2>
        <StatusChip
          {...subscriptionStatusStyle[pkg.status]}
          label={t.portal.packageStatus[pkg.status]}
        />
      </div>
      <p className="grid gap-0.5">
        <span className="text-sm text-ink-2">{t.portal.usedOfHint}</span>
        <span className="font-display text-h2 font-bold tabular-nums">{usedOfText(summary)}</span>
        <span className="text-xs text-ink-3">{t.portal.remainingHint}</span>
      </p>
      {summary.amountDue && (
        <p className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-act-soft p-3 text-act">
          <span className="text-sm font-semibold">{t.portal.amountDue}</span>
          <span className="font-display text-h3 font-bold tabular-nums">{amountText(summary.amountDue)}</span>
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="grid gap-0.5">
            <dt className="text-ink-3">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
