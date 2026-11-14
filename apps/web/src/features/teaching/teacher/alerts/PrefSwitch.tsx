import { switchInputClass, SwitchTrack } from '@/components/settings/fields/SwitchTrack';

export interface PrefSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** One «تخصيص» switch: the label, then the drawn switch over a real checkbox (44px row). */
export function PrefSwitch({ label, checked, onChange }: PrefSwitchProps) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={switchInputClass}
        />
        <SwitchTrack />
      </span>
    </label>
  );
}
