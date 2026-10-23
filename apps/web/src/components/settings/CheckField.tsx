import { SettingRow, type RowExtras } from './SettingRow';

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
        <span className="relative inline-flex">
          <input
            {...p}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0"
          />
          <span
            aria-hidden="true"
            className="block h-6 w-11 rounded-full border border-rule-input bg-sunk transition-colors duration-150 peer-checked:border-lapis-fill peer-checked:bg-lapis-fill peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lapis"
          />
          {/* The knob starts at the inline-start (right in RTL) and slides to the end when ON. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute start-[3px] top-[3px] size-[18px] rounded-full bg-ink-3 transition-transform duration-150 peer-checked:bg-white rtl:peer-checked:-translate-x-5 ltr:peer-checked:translate-x-5"
          />
        </span>
      )}
    </SettingRow>
  );
}
