import { useState } from 'react';
import { t } from '@/lib/i18n';
import { readThemePref, setThemePref, type ThemePref } from '@/lib/theme';
import { SegmentedControl } from './segmented-control';

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'auto', label: t.theme.auto },
  { value: 'light', label: t.theme.light },
  { value: 'dark', label: t.theme.dark },
];

/** المظهر: تلقائي / فاتح / ليلي. Saved per browser; «تلقائي» follows the OS. */
export function ThemeToggle({ className }: { className?: string }) {
  const [pref, setPref] = useState<ThemePref>(readThemePref);
  return (
    <SegmentedControl
      label={t.theme.label}
      options={OPTIONS}
      value={pref}
      onChange={(next) => {
        setThemePref(next);
        setPref(next);
      }}
      className={className}
    />
  );
}
