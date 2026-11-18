import { packageSummary, type PackageSummary } from '@ab/client-core';
import { subscriptionStatusStyle, type PortalPackage } from '@ab/shared';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { IconTile } from '@ab/web-kit/family/layout/IconTile';
import { FAM_CARD } from '@ab/web-kit/family/panels/panel-look';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { amountText, usedOfText } from './package-text';
import { PackageFacts } from './PackageFacts';

/** The used share as a bar (boards: teal to green on the cream track); family only. */
function UsedBar({ summary }: { summary: PackageSummary }) {
  const share = summary.total > 0 ? Math.min(100, (summary.used / summary.total) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={t.portal.usedOfHint}
      aria-valuemin={0}
      aria-valuemax={summary.total}
      aria-valuenow={summary.used}
      className="hidden h-2.5 overflow-hidden rounded-full bg-rule family:block"
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#0e7490,#059669)]"
        style={{ width: `${String(share)}%` }}
      />
    </div>
  );
}

/** The package's name and status (the family look: the gold card tile before the name). */
function Head({ pkg }: { pkg: PortalPackage }) {
  const name = pkg.package ? t.enums.packageSize[pkg.package] : t.portal.packageTab;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="contents family:flex family:items-center family:gap-3.5">
        <span className="hidden family:contents">
          <IconTile icon="card" tone="gold" />
        </span>
        <h2 className="font-display text-h3 font-bold family:text-[24px] family:font-extrabold">
          {name}
        </h2>
      </div>
      <StatusChip
        {...subscriptionStatusStyle[pkg.status]}
        label={t.portal.packageStatus[pkg.status]}
      />
    </div>
  );
}

/**
 * The package: name and status, «8 من 12» with its bar, the amount due, then the facts. The family
 * look (board PortalWebPackage): a lifted card with a gold top edge.
 */
export function PackageCard({ pkg }: { pkg: PortalPackage }) {
  const summary = packageSummary(pkg);
  return (
    <section
      className={cn('grid gap-4 rounded-lg border border-rule bg-raised p-4', FAM_CARD.gold,
        'family:gap-[18px]')}
      aria-label={t.portal.packageTab}
    >
      <Head pkg={pkg} />
      <p className="grid gap-0.5 family:gap-1">
        <span className="text-sm text-ink-2">{t.portal.usedOfHint}</span>
        <span className="font-display text-h2 font-bold tabular-nums family:text-[36px]
          family:font-extrabold">{usedOfText(summary)}</span>
        <span className="text-xs text-ink-3 family:text-[13px]">{t.portal.remainingHint}</span>
      </p>
      <UsedBar summary={summary} />
      {summary.amountDue && (
        <p className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-act-soft p-3
          text-act family:rounded-2xl family:border family:border-act/25 family:px-[18px]
          family:py-3.5">
          <span className="text-sm font-semibold family:text-[15px] family:font-bold">
            {t.portal.amountDue}
          </span>
          <span className="font-display text-h3 font-bold tabular-nums family:text-[28px]
            family:font-extrabold">{amountText(summary.amountDue)}</span>
        </p>
      )}
      <PackageFacts pkg={pkg} summary={summary} />
    </section>
  );
}
