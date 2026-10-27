import type { ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';

interface Props {
  label: string;
  hint?: string;
  /** tel = the WhatsApp number; username = email / username / student code. */
  kind: 'tel' | 'username';
  value: string;
  onValue: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error?: string;
  /** Links under «أرسل الرمز» («رجوع»…). */
  children?: ReactNode;
}

/** The first step of a code: who to send it for, then «أرسل الرمز». */
export function RequestStep({ label, hint, kind, value, onValue, onSubmit, busy, error, children }: Props) {
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
          <Input {...p} type={kind === 'tel' ? 'tel' : 'text'} dir="ltr" autoComplete={kind} autoCapitalize="none"
            required value={value} onChange={(e) => onValue(e.target.value)} />
        )}
      </Field>
      <Button type="submit" disabled={busy || !value.trim()} className="min-h-11 w-full">
        {busy ? t.familyAuth.sending : t.familyAuth.sendCode}
      </Button>
      {children}
    </form>
  );
}
