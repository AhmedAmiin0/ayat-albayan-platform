import type { SettingsPageSection } from '@/components/settings/section-id';
import { t } from '@/lib/i18n';

/** «قيم مخصصة» on /admin/settings: its section id (`#settings-custom`) and its title. */
export const CUSTOM_CONFIG_SECTION: SettingsPageSection = { id: 'custom', label: t.config.sections.custom };
