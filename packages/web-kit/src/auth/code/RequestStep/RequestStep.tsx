import { Button } from '@ab/web-kit/components/ui/form/Button';
import { Field } from '@ab/web-kit/components/ui/form/Field';
import { Input } from '@ab/web-kit/components/ui/form/Input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { Props } from './RequestStep.types';

export function RequestStep({
  label,
  hint,
  kind,
  value,
  onValue,
  onSubmit,
  busy,
  error,
  children,
}: Props) {
  return (
    <form
      noValidate
      className="grid gap-[22px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit();
      }}
    >
      <Field label={label} hint={hint} error={error}>
        {(p) => (
          <Input
            {...p}
            type={kind === 'tel' ? 'tel' : 'text'}
            dir="ltr"
            autoComplete={kind}
            autoCapitalize="none"
            required
            value={value}
            onChange={(e) => onValue(e.target.value)}
          />
        )}
      </Field>
      <Button type="submit" disabled={busy || !value.trim()} className="min-h-11 w-full">
        {busy ? t.familyAuth.sending : t.familyAuth.sendCode}
      </Button>
      {children}
    </form>
  );
}
