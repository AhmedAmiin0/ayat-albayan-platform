import { useState } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { readThemePref, setThemePref, type ThemePref } from '@ab/web-kit/lib/theme';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/segmented-control';

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'auto', label: t.theme.auto },
  { value: 'light', label: t.theme.light },
  { value: 'dark', label: t.theme.dark },
];

/**
 * المظهر: تلقائي / فاتح / ليلي. Saved per browser; «تلقائي» follows the OS. `pill`: the family
 * look's round segments (opt-in; staff keep the default).
 */
export function ThemeToggle({ className, pill }: { className?: string; pill?: boolean }) {
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
      pill={pill}
    />
  );
}
