import { useState } from 'react';
import { readThemePref, setThemePref, type ThemePref } from '@ab/web-kit/lib/theme';
import type { ThemeToggleState } from './ThemeToggle.types';

export function useThemeToggle(): ThemeToggleState {
  const [pref, setPref] = useState<ThemePref>(readThemePref);
  const choose = (next: ThemePref) => {
    setThemePref(next);
    setPref(next);
  };
  return { pref, choose };
}
