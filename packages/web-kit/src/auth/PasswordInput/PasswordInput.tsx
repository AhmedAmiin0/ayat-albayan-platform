import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Input } from '@ab/web-kit/components/ui/form/Input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { Props } from './PasswordInput.types';
import { usePasswordInput } from './use-password-input';

/** The label must not contain the password label e2e uses; the wrapper is the LTR island. */
export function PasswordInput({
  value,
  onValue,
  autoComplete = 'current-password',
  ...field
}: Props) {
  const { shown, setShown } = usePasswordInput();
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
