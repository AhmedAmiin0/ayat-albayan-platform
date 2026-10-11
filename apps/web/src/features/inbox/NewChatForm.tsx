import { normalizePhone } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';

/**
 * «محادثة جديدة» (admin and sales): type a family's WhatsApp number, open its chat (E.164 in the URL,
 * like a lead's «افتح المحادثة»). A number without messages opens NewThread: the first template.
 */
export function NewChatForm({ onOpen }: { onOpen: (phone: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <form
      aria-label={t.inbox.newChat.title}
      className="mb-3 grid gap-2 border-b border-rule pb-3"
      onSubmit={(e) => {
        e.preventDefault();
        const phone = normalizePhone(value);
        if (!phone.ok) {
          setError(t.common.phoneErrors[phone.reason]);
          return;
        }
        setError(undefined);
        setValue('');
        onOpen(phone.e164);
      }}
    >
      <Field label={t.inbox.newChat.phone} hint={error ? undefined : t.inbox.newChat.hint} error={error}>
        {(p) => (
          <Input
            {...p}
            dir="ltr"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder={t.inbox.newChat.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
      </Field>
      <Button type="submit" variant="secondary" size="sm" className="justify-self-start">
        {t.inbox.newChat.open}
      </Button>
    </form>
  );
}
