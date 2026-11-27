import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { SwitchRow } from '../../../ui/form/SwitchRow';
import { AppText } from '../../../ui/primitives/AppText';
import { InsetGroup } from '../../../ui/surface/Inset';
import { useBiometricSwitchRow } from './use-biometric-switch-row';

/** Only where biometrics are enrolled; on asks for one confirmation, off clears the flag. */
export function BiometricSwitchRow() {
  const { color } = useTheme();
  const { kind, lock, busy, change } = useBiometricSwitchRow();
  if (!kind) return null;
  return (
    <InsetGroup>
      <SwitchRow
        label={t.biometric.unlock[kind]}
        value={lock.enabled}
        disabled={busy}
        onChange={change}
        testID="biometric-switch"
      >
        <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>
          {t.biometric.settingHint}
        </AppText>
      </SwitchRow>
    </InsetGroup>
  );
}
