import { SHOWCASE_CASES } from '@ab/web-kit/components/ui/layout/showcase-cases';
import { ThemeToggle } from './ThemeToggle';

/**
 * Both sizes in RTL and LTR, light and dark; the switch has no motion of its own, so reduced
 * motion changes nothing. Compact segments are 44 px on touch and keep their names as labels.
 */
export function ThemeToggleShowcase() {
  return (
    <div className="grid gap-3 p-4">
      {SHOWCASE_CASES.map((c) => (
        <section
          key={c.key}
          aria-label={c.key}
          dir={c.dir}
          data-theme={c.theme}
          className="grid gap-2 bg-card p-3"
        >
          <ThemeToggle />
          <ThemeToggle size="compact" className="justify-self-start" />
        </section>
      ))}
    </div>
  );
}
