import { packageSummary } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalPackageQuery } from '@ab/web-kit/portal/api';
import { amountText, dayText, usedOfText } from '@ab/web-kit/portal/package/package-text';

/** A guardian's only; quiet while loading or without a package. */
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
