import { packageSummary } from '@ab/client-core';
import type { PortalMonth, PortalPackageView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { Figure } from '@/ui';
import { amountText } from '@/package';

interface CardFiguresProps {
  month: PortalMonth | undefined;
  /** The package, for a viewer who sees money; undefined otherwise or while it loads. */
  pkg: PortalPackageView | undefined;
}

/** The third tile: what is due (act), else the lessons left; none without a package. */
function PackageFigure({ pkg }: { pkg: PortalPackageView }) {
  const summary = pkg.package ? packageSummary(pkg.package) : null;
  if (!summary) return null;
  const due = summary.amountDue;
  return due ? (
    <Figure tone="act" value={amountText(due)} label={t.portal.app.package.due} />
  ) : (
    <Figure tone="ink" value={String(summary.remaining)} label={t.portal.app.children.left} />
  );
}

/** «حضر هذا الشهر» · «غاب هذا الشهر» · the package tile (canvas Home). */
export function CardFigures({ month, pkg }: CardFiguresProps) {
  const M = t.portal.app.month;
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {month ? <Figure tone="ok" value={String(month.attended)} label={M.attended} /> : null}
      {month ? <Figure tone="bad" value={String(month.absent)} label={M.absent} /> : null}
      {pkg ? <PackageFigure pkg={pkg} /> : null}
    </View>
  );
}
