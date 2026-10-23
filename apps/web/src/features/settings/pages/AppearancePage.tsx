import { t } from '@/lib/i18n';
import { AppearanceSection } from '../sections/AppearanceSection';
import { ModuleHead } from './ModuleHead';

/** /admin/settings/appearance «المظهر» (docs/26b §3): the light/dark theme of this browser, unchanged. */
export function AppearancePage() {
  return (
    <>
      <ModuleHead title={t.settings.sections.appearance} />
      <AppearanceSection />
    </>
  );
}
