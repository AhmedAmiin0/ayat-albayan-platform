import { Section } from '@/components/settings/Section';
import { matchesText } from '@/components/settings/search/settings-search';
import { useSettingsView } from '@/components/settings/settings-view';
import { ThemeToggle } from '@/components/ui/layout/theme-toggle';
import { t } from '@/lib/i18n';

/** Does the search match the theme row's words? */
export const themeMatch = (query: string): boolean => matchesText(`${t.settings.theme} ${t.settings.themeHint}`, query);

/** «المظهر»: the light/dark theme of this browser (not a stored setting). */
export function AppearanceSection() {
  const { query } = useSettingsView();
  if (!themeMatch(query)) return null;
  return (
    <Section id="appearance" title={t.settings.sections.appearance}>
      <div className="grid gap-x-6 gap-y-2 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="grid gap-0.5">
          <p className="text-sm font-semibold">{t.settings.theme}</p>
          <p className="text-xs text-ink-3">{t.settings.themeHint}</p>
        </div>
        <ThemeToggle />
      </div>
    </Section>
  );
}
