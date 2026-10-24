import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export type A11yPref = 'reduceMotion' | 'reduceTransparency';

const READ = {
  reduceMotion: () => AccessibilityInfo.isReduceMotionEnabled(),
  reduceTransparency: () => AccessibilityInfo.isReduceTransparencyEnabled(), // false on Android
};
const EVENT = { reduceMotion: 'reduceMotionChanged', reduceTransparency: 'reduceTransparencyChanged' } as const;

/** The system's «Reduce Motion» / «Reduce Transparency» switch, live; false until it is read. */
export function useA11yPref(pref: A11yPref): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    void READ[pref]()
      .then((value) => {
        if (live) setOn(value);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener(EVENT[pref], setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, [pref]);
  return on;
}
