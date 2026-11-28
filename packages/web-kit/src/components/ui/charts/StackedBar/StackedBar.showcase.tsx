import { SHOWCASE_FRAMES } from '@ab/web-kit/components/ui/showcase-frames';
import { FAMILY_SHARES, STAFF_SHARES } from '@ab/web-kit/components/ui/charts/chart-samples';
import { StackedBar } from './StackedBar';

/**
 * Staff lessons by status with two flagged, selectable segments and a family month of attendance,
 * at 360 px in RTL and LTR, light and dark. Static, so reduced motion changes nothing.
 */
export function StackedBarShowcase() {
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
          <StackedBar {...STAFF_SHARES} />
          <StackedBar {...FAMILY_SHARES} />
        </section>
      ))}
    </div>
  );
}
