import { SETTINGS_LAYOUT, type AcademySettings, type CustomConfigView, type SettingKey, type SettingsSectionId } from '@ab/shared';
import type { ReactNode } from 'react';
import type { SettingsPageSection } from '@/components/settings/section-id';
import { matchesSetting } from '@/components/settings/settings-search';
import { matchesCustom } from '@/features/custom-config/custom-form';
import { CUSTOM_CONFIG_SECTION } from '@/features/custom-config/custom-section';
import { CustomValuesPanel } from '@/features/custom-config/CustomValuesPanel';
import { integrationsMatch } from '@/features/integrations/integrations-form';
import { INTEGRATIONS_SECTION } from '@/features/integrations/integrations-section';
import { IntegrationsPanel } from '@/features/integrations/IntegrationsPanel';
import { linesMatch } from '@/features/messaging/lines-match';
import { catalogueMatch } from '@/features/notification-catalogue/catalogue-match';
import { NUMBERS_SECTION, numbersMatch } from '@/features/numbers/numbers-section';
import { NumbersPanel } from '@/features/numbers/NumbersPanel';
import { templatesMatch } from '@/features/templates/templates-match';
import { t } from '@/lib/i18n';
import type { SettingsFormState } from './registry-form/use-settings-form';
import { AppearanceSection, themeMatch } from './sections/AppearanceSection';
import { FieldsSection } from './sections/FieldsSection';
import { MessagingSection } from './sections/MessagingSection';
import { SalesSection } from './sections/SalesSection';

/** What a section of /admin/settings is drawn from. */
export interface SectionProps {
  settings: AcademySettings;
  state: SettingsFormState;
  query: string;
  onNote: (message: string) => void;
}

/** One section of the page: its index entry, what the search finds in it, and how it is drawn. */
export interface PageSection extends SettingsPageSection {
  /** Does the search find anything in it (the «nothing matches» note asks every section)? */
  matches: (query: string, custom: readonly CustomConfigView[]) => boolean;
  render: (p: SectionProps) => ReactNode;
}

/** Any settings row of the section (SETTINGS_LAYOUT: the switches that save on their own too). */
const anyRow = (id: SettingsSectionId, query: string): boolean =>
  (SETTINGS_LAYOUT[id] as readonly SettingKey[]).some((k) => matchesSetting(k, query));

/** The sections made only of registry fields, in page order between messaging and sales. */
const FIELD_SECTIONS = ['schedule', 'classroom', 'reports', 'accounts', 'uploads', 'academy'] as const;

const fieldSection = (id: (typeof FIELD_SECTIONS)[number]): PageSection => ({
  id,
  label: t.settings.sections[id],
  matches: (query) => anyRow(id, query),
  render: (p) => <FieldsSection id={id} state={p.state} />,
});

/**
 * /admin/settings in page order: the index (SettingsNav), the body (SettingsBody) and the «nothing
 * matches» note all read this list. The registry's nine sections, then «الأرقام», «التكاملات», then «قيم مخصصة».
 */
export const PAGE_SECTIONS: readonly PageSection[] = [
  {
    id: 'messaging',
    label: t.settings.sections.messaging,
    matches: (query) => anyRow('messaging', query) || linesMatch(query) || catalogueMatch(query) || templatesMatch(query),
    render: (p) => <MessagingSection settings={p.settings} state={p.state} />,
  },
  ...FIELD_SECTIONS.map(fieldSection),
  {
    id: 'sales',
    label: t.settings.sections.sales,
    matches: (query) => matchesSetting('sales_auto_assign', query),
    render: (p) => <SalesSection settings={p.settings} />,
  },
  {
    id: 'appearance',
    label: t.settings.sections.appearance,
    matches: (query) => themeMatch(query),
    render: () => <AppearanceSection />,
  },
  {
    ...NUMBERS_SECTION,
    matches: (query) => numbersMatch(query),
    render: (p) => <NumbersPanel query={p.query} onSaved={p.onNote} />,
  },
  {
    ...INTEGRATIONS_SECTION,
    matches: (query) => integrationsMatch(query),
    render: (p) => <IntegrationsPanel query={p.query} onSaved={p.onNote} />,
  },
  {
    ...CUSTOM_CONFIG_SECTION,
    matches: (query, custom) => custom.some((e) => matchesCustom(e, query)),
    render: (p) => <CustomValuesPanel query={p.query} onSaved={p.onNote} />,
  },
];
