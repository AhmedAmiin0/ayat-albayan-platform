import type { AcademySettings } from '@ab/shared';
import { DangerFrame } from '@/components/settings/DangerFrame';
import { AutoMessagesSwitch } from '@/features/messaging/AutoMessagesSwitch';
import { MessagingSwitch } from '@/features/messaging/MessagingSwitch';

/**
 * «الإرسال»: the switches that save on their own, as they were on the old settings page — the kill
 * switch (with its server note) and the automatic messages, each in its danger frame. The feedback
 * mode is the «أزرار تقييم الحلقة» row of «الإشعارات» now (docs/26b §6a 1.7).
 */
export function SendingTab({ settings }: { settings: AcademySettings }) {
  return (
    <div className="grid gap-4">
      <DangerFrame>
        <MessagingSwitch settings={settings} />
      </DangerFrame>
      <DangerFrame>
        <AutoMessagesSwitch settings={settings} />
      </DangerFrame>
    </div>
  );
}
