import type { AcademySettings } from '@ab/settings';
import { DangerFrame } from '@/components/settings/fields/DangerFrame';
import { AutoMessagesSwitch } from '@/features/messaging/messaging/AutoMessagesSwitch';
import { MessagingSwitch } from '@/features/messaging/messaging/MessagingSwitch';
import { t } from '@ab/web-kit';
import { OverviewNumbers } from './OverviewNumbers';
import { OwnTraffic } from './OwnTraffic';
import { OverviewWhat } from './OverviewWhat';
import { PublicNumber } from './PublicNumber';

/** docs/23 §2d tab 1, docs/26b §6a 1.1-1.10: two columns on wide screens to fit one screen. */
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
        <OverviewWhat messagingOn={settings.messaging_enabled} />
        <PublicNumber e164={settings.academy_whatsapp_e164} />
        <OwnTraffic />
      </div>
    </div>
  );
}
