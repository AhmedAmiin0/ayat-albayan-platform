import { useState } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { readThemePref, setThemePref, type ThemePref } from '@ab/web-kit/lib/theme';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/segmented-control';

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'auto', label: t.theme.auto },
  { value: 'light', label: t.theme.light },
  { value: 'dark', label: t.theme.dark },
];

/** Saved per browser; automatic follows the OS. */
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
