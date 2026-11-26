import type { AcademySettings } from '@ab/settings';
import { DangerFrame } from '@/components/settings/fields/DangerFrame';
import {
  EVOLUTION_GROUPS,
  KAPSO_GROUPS,
  SAFETY_GUARD_GROUPS,
  WACRM_GROUPS,
} from '@/features/platform/integrations/integration-places';
import { IntegrationsPanel } from '@/features/platform/integrations/IntegrationsPanel';
import { t } from '@ab/web-kit';
import { CrmCutoverCard } from '@/features/platform/settings/pages/communications/CrmCutoverCard';

/** docs/23 §2d tab 5, docs/26b §6a: emptying the allow-list still asks first. */
export function SafetyTab({
  settings,
  onNote,
}: {
  settings: AcademySettings;
  onNote: (message: string) => void;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <div className="grid min-w-0 gap-6">
        <DangerFrame>
          <CrmCutoverCard settings={settings} />
        </DangerFrame>
        <IntegrationsPanel
          query=""
          onSaved={onNote}
          groups={SAFETY_GUARD_GROUPS}
          title={t.settingsPages.communicationsTabs.safety}
          intro={t.communicationsHub.safetyIntro}
        />
      </div>
      {/* Each section heading names its driver already: the group heading stays for screen readers only. */}
      <div className="grid min-w-0 gap-6 [&_[role=group]>h3]:sr-only">
        <IntegrationsPanel query="" onSaved={onNote} groups={KAPSO_GROUPS} title={t.integrations.groups.kapso} />
        <IntegrationsPanel query="" onSaved={onNote} groups={WACRM_GROUPS} title={t.integrations.groups.wacrm} />
        <IntegrationsPanel
          query=""
          onSaved={onNote}
          groups={EVOLUTION_GROUPS}
          title={t.integrations.groups.evolution}
        />
      </div>
    </div>
  );
}
