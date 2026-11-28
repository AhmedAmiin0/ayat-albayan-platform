import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SHOWCASE_FRAMES } from '@ab/web-kit/components/ui/showcase-frames';
import { Checkbox } from './Checkbox';

const noop = () => undefined;

/**
 * A staff choice with a hint and a family choice, ticked, clear and disabled, at 360 px in RTL and
 * LTR, light and dark. The box is the browser's own, so it has no motion to reduce.
 */
export function CheckboxShowcase() {
  return (
    <div className="grid gap-3 p-4">
      {SHOWCASE_FRAMES.map((f) => (
        <section
          key={f.key}
          aria-label={f.key}
          dir={f.dir}
          data-theme={f.theme}
          className="grid max-w-90 gap-1 bg-card p-3"
        >
          <Checkbox
            label={t.templates.settings.reminder24hEnabled}
            hint={t.templates.settings.reminder24hHint}
            checked
            onCheckedChange={noop}
          />
          <Checkbox label={t.nav.reports} checked={false} onCheckedChange={noop} />
          <Checkbox label={t.nav.subscriptions} checked disabled onCheckedChange={noop} />
        </section>
      ))}
    </div>
  );
}
