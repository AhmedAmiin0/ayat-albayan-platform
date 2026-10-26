import { useCallback, useEffect, useState } from 'react';
import { restoreAppearance, saveAppearance, type AppearancePref } from './appearance';

/**
 * The «المظهر» setting: [current choice, choose]. Mounting also restores the saved choice, which
 * covers the case where the root layout has not restored it yet.
 */
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
  const choose = useCallback((next: AppearancePref) => {
    setPref(next);
    void saveAppearance(next);
  }, []);
  return [pref, choose];
}
