import type { AcademySettings } from '@ab/shared';
import { CatalogueSection } from '@/features/notification-catalogue/CatalogueSection';
import { t } from '@/lib/i18n';
import { useSettingsForm } from '../../registry-form/use-settings-form';
import { SaveBar } from '../../SaveBar';
import { SectionFields } from '../../sections/SectionFields';

interface CatalogueTabProps {
  settings: AcademySettings;
  onSaved: () => void;
}

/**
 * «ماذا يُرسل ومتى»: the read-only catalogue (one audience at a time), then the messages' timing
 * fields (the registry's «messaging» rows) with their own form and «حفظ» — the same one PATCH
 * /settings as before, scoped to this page.
 */
export function CatalogueTab({ settings, onSaved }: CatalogueTabProps) {
  const state = useSettingsForm(settings, onSaved);
  return (
    <div className="grid min-w-0 gap-6">
      <CatalogueSection />
      <section aria-labelledby="communications-timing-title" className="grid gap-2">
        <h2 id="communications-timing-title" className="text-h4 font-bold">
          {t.settingsPages.timingTitle}
        </h2>
        <SectionFields id="messaging" state={state} />
        <SaveBar state={state} />
      </section>
    </div>
  );
}
