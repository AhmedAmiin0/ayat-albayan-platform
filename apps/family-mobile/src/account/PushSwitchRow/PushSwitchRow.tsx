import { t, SwitchRow, AppText, type, useTheme } from '@ab/mobile-kit';
import type { PushSwitchRowProps } from './PushSwitchRow.types';
import { usePushSwitchRow } from './use-push-switch-row';

/** On/off for this phone only (docs/50 §6). */
export function PushSwitchRow({ hint }: PushSwitchRowProps) {
  const { color } = useTheme();
  const { push } = usePushSwitchRow();
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
