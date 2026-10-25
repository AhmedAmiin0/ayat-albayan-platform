import type { AcademySettings } from '@ab/shared';
import { DangerFrame } from '@/components/settings/fields/DangerFrame';
import { KAPSO_GROUPS, SAFETY_GUARD_GROUPS, WACRM_GROUPS } from '@/features/integrations/integration-places';
import { IntegrationsPanel } from '@/features/integrations/IntegrationsPanel';
import { t } from '@/lib/i18n/i18n';
import { CrmCutoverCard } from '../CrmCutoverCard';

/**
 * «الحماية» (docs/23 §2d tab 5, docs/26b §6a 1.2–1.3, 10.16–10.21): the CRM cut-over in its danger
 * frame and the test guards on one side, Kapso and the CRM driver on the other (two columns on a wide screen, so the tab
 * fits one screen) — the same form «التكاملات» had, one panel per side with its own «حفظ», limited to
 * those groups (emptying the allow-list still asks first).
 */
export function SafetyTab({ settings, onNote }: { settings: AcademySettings; onNote: (message: string) => void }) {
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
      </div>
    </div>
  );
}
