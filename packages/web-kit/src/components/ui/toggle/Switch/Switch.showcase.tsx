import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SHOWCASE_FRAMES } from '@ab/web-kit/components/ui/showcase-frames';
import { Switch } from './Switch';

const WORDS = { on: t.mobileAdmin.settings.on, off: t.mobileAdmin.settings.off };
const noop = () => undefined;

/**
 * A staff setting and a family preference, on, off and disabled, at 360 px in RTL and LTR, light
 * and dark. Reduced motion stops the knob's slide; the state word is always printed.
 */
export function SwitchShowcase() {
  return (
    <div className="grid gap-3 p-4">
      {SHOWCASE_FRAMES.map((f) => (
        <section
          key={f.key}
          aria-label={f.key}
          dir={f.dir}
          data-theme={f.theme}
          className="grid max-w-90 gap-2 bg-card p-3"
        >
          <Switch
            label={t.templates.settings.messagingEnabled}
            words={WORDS}
            checked
            onCheckedChange={noop}
          />
          <Switch label={t.nav.reports} words={WORDS} checked={false} onCheckedChange={noop} />
          <Switch label={t.nav.reports} words={WORDS} checked disabled onCheckedChange={noop} />
        </section>
      ))}
    </div>
  );
}
