import { SHOWCASE_FRAMES } from '@ab/web-kit/components/ui/showcase-frames';
import {
  FAMILY_COLUMNS,
  MONTHS,
  STAFF_COLUMNS,
} from '@ab/web-kit/components/ui/charts/chart-samples';
import { ColumnChart } from './ColumnChart';

/**
 * Staff revenue and cost columns with a margin line and a family attendance column per month, at
 * 360 px in RTL and LTR, light and dark; the oldest month sits at inline-start. Static.
 */
export function ColumnChartShowcase() {
  return (
    <div className="grid gap-3 p-4">
      {SHOWCASE_FRAMES.map((f) => (
        <section
          key={f.key}
          aria-label={f.key}
          dir={f.dir}
          data-theme={f.theme}
          className="grid max-w-90 gap-4 bg-card p-3"
        >
          <ColumnChart {...STAFF_COLUMNS} months={MONTHS} />
          <ColumnChart {...FAMILY_COLUMNS} months={MONTHS} />
        </section>
      ))}
    </div>
  );
}
