import type { PackageSummary } from '@ab/client-core';
import type { PortalPackage } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { dayText } from './package-text';

interface Props {
  pkg: PortalPackage;
  summary: PackageSummary;
}

/**
 * Lessons left, the lesson's length, the start and the renewal day (when there is one). The
 * family look (board PortalWebPackage): each fact on its own cream tile.
 */
export function PackageFacts({ pkg, summary }: Props) {
  const facts: [string, string][] = [
    [t.portal.remaining, String(summary.remaining)],
    [t.portal.lessonLength, t.portal.minutes.replace('{n}', String(pkg.duration))],
    [t.portal.startsOn, dayText(pkg.starts_on)],
    ...(summary.renewsOn
      ? [[t.portal.renewsOn, dayText(summary.renewsOn)] as [string, string]]
      : []),
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm family:gap-2.5">
      {facts.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-0.5 family:rounded-[14px] family:border family:border-rule
            family:bg-sunk family:px-3.5 family:py-3"
        >
          <dt className="text-ink-3 family:text-[13px] family:font-semibold">{label}</dt>
          <dd className="font-semibold tabular-nums family:text-body family:font-extrabold">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
