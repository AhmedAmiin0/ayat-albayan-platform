import { SHOWCASE_CASES } from '@ab/web-kit/components/ui/layout/showcase-cases';
import { ClockToggle } from './ClockToggle';

/** Full and compact, in each direction and theme; the compact «12» and «24» keep full names. */
export function ClockToggleShowcase() {
  return (
    <ul className="flex flex-col gap-3 p-4">
      {SHOWCASE_CASES.map(({ key, dir, theme }) => (
        <li
          key={key}
          dir={dir}
          data-theme={theme}
          className="flex flex-wrap items-center gap-3 bg-card p-3"
        >
          <span className="text-xs text-ink-3">{key}</span>
          <ClockToggle />
          <ClockToggle size="compact" />
        </li>
      ))}
    </ul>
  );
}
