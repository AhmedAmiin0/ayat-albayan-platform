import { SHOWCASE_FRAMES } from '@ab/web-kit/components/ui/showcase-frames';
import { FAMILY_BARS, STAFF_BARS } from '@ab/web-kit/components/ui/charts/chart-samples';
import { BarList } from './BarList';

/**
 * Staff leads by source with openable rows and a family month out of ten, at 360 px in RTL and
 * LTR, light and dark. Nothing moves, so reduced motion changes nothing; openable labels are 44 px.
 */
export function BarListShowcase() {
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
          <BarList {...STAFF_BARS} />
          <BarList {...FAMILY_BARS} max={10} />
        </section>
      ))}
    </div>
  );
}
