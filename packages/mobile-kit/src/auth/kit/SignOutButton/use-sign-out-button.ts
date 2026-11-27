import { useState } from 'react';
import { signOutDevice } from '../../../lib/session/sign-out';

export function useSignOutButton() {
  const [leaving, setLeaving] = useState(false);
  const logout = () => {
    setLeaving(true);
    void signOutDevice().finally(() => setLeaving(false));
  };
  return { leaving, logout };
}
