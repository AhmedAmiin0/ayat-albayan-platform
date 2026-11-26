import { useState } from 'react';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { SwitchRow } from '../../../ui/form/SwitchRow';
import { AppText } from '../../../ui/primitives/AppText';
import { InsetGroup } from '../../../ui/surface/Inset';
import { bioLock, useBioLock } from '../../core/bio-lock';

/** Only where biometrics are enrolled; on asks for one confirmation, off clears the flag. */
export function BiometricSwitchRow() {
  const { color } = useTheme();
  const { kind, lock } = useBioLock();
  const [busy, setBusy] = useState(false);
  if (!kind) return null;
  const turnOn = () => {
    setBusy(true);
    void bioLock.enable().finally(() => setBusy(false));
  };
  const change = (on: boolean) => (on ? turnOn : bioLock.disable)();
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
