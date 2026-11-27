import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../../../lib/i18n/i18n';
import { useMyProfile } from '../../../lib/profile/my-profile';
import { signOutDevice } from '../../../lib/session/sign-out';
import { space } from '../../../theme';
import { bioLock } from '../../core/bio-lock';
import { useDissolve } from '../use-dissolve';

const firstName = (full: string | undefined) => full?.trim().split(/\s+/)[0] ?? '';

export function useLockScreen() {
  const bottom = useSafeAreaInsets().bottom + space[6];
  const dissolve = useDissolve();
  const [leaving, setLeaving] = useState(false);
  const name = firstName(useMyProfile().data?.full_name);
  const B = t.biometric;
  const open = (result: string) => {
    if (result === 'success') dissolve.run(bioLock.finish);
  };
  const other = () => {
    setLeaving(true);
    void signOutDevice().finally(() => setLeaving(false));
  };
  const prompt = () => void bioLock.autoPrompt().then(open);
  const unlock = () => void bioLock.unlock().then(open);
  return { bottom, dissolve, leaving, name, B, other, prompt, unlock };
}
