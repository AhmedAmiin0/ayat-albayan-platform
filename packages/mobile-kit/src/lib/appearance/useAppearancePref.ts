import { useEffect, useState } from 'react';
import { restoreAppearance, saveAppearance, type AppearancePref } from './appearance';

/** Mounting also restores the saved choice in case the root layout has not yet. */
export function useAppearancePref(): [AppearancePref, (pref: AppearancePref) => void] {
  const [pref, setPref] = useState<AppearancePref>('auto');
  useEffect(() => {
    let live = true;
    void restoreAppearance().then((saved) => {
      if (live) setPref(saved);
    });
    return () => {
      live = false;
    };
  }, []);
  // The React Compiler keeps `choose` stable (no useCallback).
  const choose = (next: AppearancePref) => {
    setPref(next);
    void saveAppearance(next);
  };
  return [pref, choose];
}
