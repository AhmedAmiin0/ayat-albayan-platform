import { t } from '@ab/web-kit';
import { AppearanceSection } from '@/features/platform/settings/sections/AppearanceSection';
import { ModuleHead } from './ModuleHead';

/** docs/26b §3: the theme applies to this browser only. */
export function AppearancePage() {
  return (
    <>
      <ModuleHead title={t.settings.sections.appearance} />
      <AppearanceSection />
    </>
  );
}
