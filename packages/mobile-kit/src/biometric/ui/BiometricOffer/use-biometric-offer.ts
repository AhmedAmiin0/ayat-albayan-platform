import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../../../lib/i18n/i18n';
import { space } from '../../../theme';
import { useA11yPref } from '../../../ui/primitives/use-a11y-pref';
import { bioLock } from '../../core/bio-lock';

export function useBiometricOffer() {
  const still = useA11yPref('reduceMotion');
  const bottom = useSafeAreaInsets().bottom + space[5];
  const [busy, setBusy] = useState(false);
  const B = t.biometric;
  const enable = () => {
    setBusy(true);
    void bioLock.enable().finally(() => setBusy(false));
  };
  return { still, bottom, busy, B, enable };
}
