import { useState } from 'react';
import { bioLock, useBioLock } from '../../core/bio-lock';

export function useBiometricSwitchRow() {
  const { kind, lock } = useBioLock();
  const [busy, setBusy] = useState(false);
  const turnOn = () => {
    setBusy(true);
    void bioLock.enable().finally(() => setBusy(false));
  };
  const change = (on: boolean) => (on ? turnOn : bioLock.disable)();
  return { kind, lock, busy, change };
}
