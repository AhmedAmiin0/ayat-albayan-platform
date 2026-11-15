import type { ReactNode } from 'react';
import { Section } from '@/components/settings/Section';
import { matchesText } from '@/components/settings/search/settings-search';
import { useSettingsView } from '@/components/settings/settings-view';
import { ClockToggle } from '@/components/ui/layout/clock-toggle';
import { ThemeToggle } from '@/components/ui/layout/theme-toggle';
import { t } from '@/lib/i18n/i18n';

const themeMatch = (query: string): boolean => matchesText(`${t.settings.theme} ${t.settings.themeHint}`, query);
const clockMatch = (query: string): boolean => matchesText(`${t.clock.label} ${t.clock.hint}`, query);

/** Does the search match the theme or the clock-format row's words? */
export const appearanceMatch = (query: string): boolean => themeMatch(query) || clockMatch(query);

function Row({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-6 gap-y-2 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid gap-0.5">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-ink-3">{hint}</p>
      </div>
      {children}
    </div>
  );
}

/** «المظهر»: the light/dark theme and the 12/24-hour clock of this browser (not stored settings). */
export function AppearanceSection() {
  const { query } = useSettingsView();
  const theme = themeMatch(query);
  const clock = clockMatch(query);
  if (!theme && !clock) return null;
  return (
    <Section id="appearance" title={t.settings.sections.appearance}>
      {theme && (
        <Row title={t.settings.theme} hint={t.settings.themeHint}>
          <ThemeToggle />
        </Row>
      )}
      {clock && (
        <Row title={t.clock.label} hint={t.clock.hint}>
          <ClockToggle />
        </Row>
      )}
    </Section>
  );
}
