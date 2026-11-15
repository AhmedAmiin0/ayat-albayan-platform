import { t, SwitchRow, AppText, type, useTheme } from '@ab/mobile-kit';
import { useDevicePush } from './use-device-push';

/** «الإشعارات على هذا الجهاز»: on/off for this phone only (docs/50 §6). */
export function PushSwitchRow() {
  const { color } = useTheme();
  const push = useDevicePush();
  const S = t.familyApp.settings;
  return (
    <SwitchRow
      label={S.notifications}
      value={push.on === true}
      disabled={push.on === undefined || push.busy}
      onChange={push.set}
    >
      <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>{S.notificationsHint}</AppText>
    </SwitchRow>
  );
}
