import { fillSlots } from '@ab/client-core';
import { useId } from 'react';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const F = t.shortLinks.form;

interface MaxUsersFieldProps {
  /** Digits as typed; empty means no limit. */
  value: string;
  onChange: (next: string) => void;
  /** The listed people and numbers: the cap the hint names (0 = no list). */
  listed: number;
  error?: string | undefined;
}

export function MaxUsersField({ value, onChange, listed, error }: MaxUsersFieldProps) {
  const boxId = useId();
  const unlimited = value === '';
  const cap = listed > 0 ? ` ${fillSlots(F.maxUsersCap, { n: listed })}` : '';
  const toggle = (on: boolean) => onChange(on ? '' : String(Math.max(1, listed)));
  return (
    <Field label={F.maxUsers} hint={`${F.maxUsersHint}${cap}`} error={error}>
      {(control) => (
        <div className="flex flex-wrap items-center gap-3">
          <Input
            {...control}
            inputMode="numeric"
            dir="ltr"
            className="w-28 text-start tabular-nums"
            value={value}
            placeholder={F.unlimited}
            onChange={(e) => onChange(e.target.value)}
          />
          <label htmlFor={boxId} className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input
              id={boxId}
              type="checkbox"
              className="size-[18px] accent-primary"
              checked={unlimited}
              onChange={(e) => toggle(e.target.checked)}
            />
            {F.unlimited}
          </label>
        </div>
      )}
    </Field>
  );
}
