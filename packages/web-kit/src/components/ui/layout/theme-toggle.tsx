import { useState } from 'react';
import { t } from '#/lib/i18n/index.ts';
import { readThemePref, setThemePref, type ThemePref } from '#/lib/index.ts';
import { SegmentedControl } from '#/components/ui/form/segmented-control.tsx';

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
