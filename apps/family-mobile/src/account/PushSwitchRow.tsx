import { t, SwitchRow, AppText, type, useTheme } from '@ab/mobile-kit';
import { useDevicePush } from './use-device-push';

/** On/off for this phone only (docs/50 §6). */
export function PushSwitchRow({ hint }: { hint: string }) {
  const { color } = useTheme();
  const push = useDevicePush();
  return (
    <SwitchRow
      label={t.familyApp.settings.notifications}
      value={push.on === true}
      disabled={push.on === undefined || push.busy}
      onChange={push.set}
    >
      <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>{hint}</AppText>
    </SwitchRow>
  );
}
