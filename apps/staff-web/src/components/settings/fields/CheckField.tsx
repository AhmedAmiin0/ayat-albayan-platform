import { SettingRow, type RowExtras } from './SettingRow';
import { SwitchTrack, switchInputClass } from './SwitchTrack';

export interface CheckFieldProps extends RowExtras {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

/** An on/off setting: a checkbox drawn as a switch (still a checkbox to assistive tech and tests). */
export function CheckField({ label, checked, onChange, hint, ...row }: CheckFieldProps) {
  return (
    <SettingRow label={label} hint={hint} {...row}>
      {(p) => (
        // A real checkbox (role, name, keyboard) laid invisibly over a drawn track and knob.
        <span className="relative inline-flex items-center">
          <input {...p} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={switchInputClass} />
          <SwitchTrack />
        </span>
      )}
    </SettingRow>
  );
}
