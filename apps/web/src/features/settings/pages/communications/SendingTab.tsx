import type { AcademySettings } from '@ab/shared';
import { DangerFrame } from '@/components/settings/DangerFrame';
import { AutoMessagesSwitch } from '@/features/messaging/AutoMessagesSwitch';
import { FeedbackModeSwitch } from '@/features/messaging/FeedbackModeSwitch';
import { MessagingSwitch } from '@/features/messaging/MessagingSwitch';

/**
 * «الإرسال»: the switches that save on their own, as they were on the old settings page — the kill
 * switch (with its server note) and the automatic messages, each in its danger frame, then the
 * feedback mode.
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
      <FeedbackModeSwitch settings={settings} />
    </div>
  );
}
