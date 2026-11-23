import { packageSummary } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { t } from '#/lib/i18n/index.ts';
import { portalPackageQuery } from '#/portal/api.ts';
import { amountText, dayText, usedOfText } from '#/portal/package/package-text.ts';

/**
 * The home card's package summary (a guardian's only): «8 من 12», the renewal day and the amount
 * due as a badge. Quiet while loading or without a package.
 */
export function PackageLine({ studentId }: { studentId: string }) {
  const pkg = useQuery(portalPackageQuery(studentId)).data?.package;
  if (!pkg) return null;
  const summary = packageSummary(pkg);
  return (
    <section
      aria-label={t.portal.packageTab}
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule pt-3 text-sm"
    >
      <span className="font-semibold">{t.portal.packageTab}</span>
      <span className="tabular-nums">{usedOfText(summary)}</span>
      {summary.renewsOn && (
        <span className="text-ink-2">
          {t.portal.renewsOn}: {dayText(summary.renewsOn)}
        </span>
      )}
      {summary.amountDue && (
        <span className="rounded-sm bg-act-soft px-2 py-0.5 text-xs font-semibold text-act">
          {t.portal.amountDue}: {amountText(summary.amountDue)}
        </span>
      )}
    </section>
  );
}
