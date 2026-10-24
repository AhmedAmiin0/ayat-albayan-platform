import type { AcademySettings } from '@ab/shared';
import { DangerFrame } from '@/components/settings/DangerFrame';
import { SAFETY_GROUPS } from '@/features/integrations/integration-places';
import { IntegrationsPanel } from '@/features/integrations/IntegrationsPanel';
import { t } from '@/lib/i18n';
import { CrmCutoverCard } from './CrmCutoverCard';

/**
 * «الحماية» (docs/23 §2d tab 5, docs/26b §6a 1.2–1.3, 10.16–10.21): the CRM cut-over in its danger
 * frame, then the test guards (allow-list, which asks when emptied; template sync) and Kapso, with
 * their own «حفظ» — the same form «التكاملات» had, limited to these groups.
 */
export function SafetyTab({ settings, onNote }: { settings: AcademySettings; onNote: (message: string) => void }) {
  return (
    <div className="grid gap-8">
      <DangerFrame>
        <CrmCutoverCard settings={settings} />
      </DangerFrame>
      <IntegrationsPanel
        query=""
        onSaved={onNote}
        groups={SAFETY_GROUPS}
        title={t.settingsPages.communicationsTabs.safety}
        intro={t.communicationsHub.safetyIntro}
      />
    </div>
  );
}
