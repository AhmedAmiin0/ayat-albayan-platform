import type { SettingsPageSection } from '@/components/settings/section-id';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** «التكاملات» on /admin/settings: its section id (`#settings-integrations`) and its title. */
export const INTEGRATIONS_SECTION: SettingsPageSection = { id: 'integrations', label: t.integrations.title };
