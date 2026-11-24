import { useState } from 'react';
import type { FieldControlProps } from '@ab/web-kit/components/ui/form/field';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';

type Props = FieldControlProps & {
  value: string;
  onValue: (value: string) => void;
  /** `new-password` for a new one (password managers offer to generate and save it). */
  autoComplete?: 'current-password' | 'new-password';
};

/** The label must not contain the password label e2e uses; the wrapper is the LTR island. */
export function PasswordInput({ value, onValue, autoComplete = 'current-password', ...field }: Props) {
  const [shown, setShown] = useState(false);
  return (
    <div dir="ltr" className="relative">
      <Input
        {...field}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        className="pe-12"
        value={value}
        onChange={(e) => onValue(e.target.value)}
      />
      <button
        type="button"
        aria-label={t.auth.showPassword}
        aria-pressed={shown}
        aria-controls={field.id}
        onClick={() => setShown((s) => !s)}
        className="absolute inset-y-0 end-1 my-auto grid size-9 cursor-pointer place-items-center rounded-sm text-ink-2 hover:bg-accent hover:text-lapis aria-pressed:text-lapis max-sm:size-11"
      >
        <Icon name={shown ? 'eye-off' : 'eye'} />
      </button>
    </div>
  );
}
