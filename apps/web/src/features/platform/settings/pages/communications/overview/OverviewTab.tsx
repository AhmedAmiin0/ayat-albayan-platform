import type { AcademySettings } from '@ab/shared';
import { DangerFrame } from '@/components/settings/fields/DangerFrame';
import { AutoMessagesSwitch } from '@/features/messaging/messaging/AutoMessagesSwitch';
import { MessagingSwitch } from '@/features/messaging/messaging/MessagingSwitch';
import { t } from '@/lib/i18n/i18n';
import { OverviewNumbers } from './OverviewNumbers';
import { OwnTraffic } from './OwnTraffic';
import { OverviewWhat } from './OverviewWhat';
import { PublicNumber } from './PublicNumber';

/**
 * «نظرة عامة» (docs/23 §2d tab 1, docs/26b §6a 1.1–1.10): the two master switches as they were (the
 * kill switch with its server note and queued count, the automatic messages, each in its danger
 * frame), then short read-only tables — the numbers and their health, what sends now per audience —
 * and the number the families see. Two columns on a wide screen, so it fits one screen.
 */
export function OverviewTab({ settings }: { settings: AcademySettings }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section aria-labelledby="overview-switches" className="grid min-w-0 gap-3">
        <h2 id="overview-switches" className="text-h4 font-bold">
          {t.communicationsHub.switchesTitle}
        </h2>
        <DangerFrame>
          <MessagingSwitch settings={settings} />
        </DangerFrame>
        <DangerFrame>
          <AutoMessagesSwitch settings={settings} />
        </DangerFrame>
      </section>
      <div className="grid min-w-0 gap-6">
        <OverviewNumbers />
        <OverviewWhat messagingOn={settings.messaging_enabled === true} />
        <PublicNumber e164={settings.academy_whatsapp_e164} />
        <OwnTraffic />
      </div>
    </div>
  );
}
