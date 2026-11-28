import type { ReactNode } from 'react';
import { Section } from '@/components/settings/Section';
import { matchesText } from '@/components/settings/search/settings-search';
import { useSettingsView } from '@/components/settings/settings-view';
import { ThemeToggle, t } from '@ab/web-kit';

/** Does the search match the theme row's words? The web has no time-format row (12 h only). */
export const appearanceMatch = (query: string): boolean =>
  matchesText(`${t.settings.theme} ${t.settings.themeHint}`, query);

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

/** The theme of this browser, not a stored setting. */
export function AppearanceSection() {
  const { query } = useSettingsView();
  if (!appearanceMatch(query)) return null;
  return (
    <Section id="appearance" title={t.settings.sections.appearance}>
      <Row title={t.settings.theme} hint={t.settings.themeHint}>
        <ThemeToggle />
      </Row>
    </Section>
  );
}
