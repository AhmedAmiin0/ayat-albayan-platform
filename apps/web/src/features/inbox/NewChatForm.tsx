import { normalizePhone } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';

/**
 * «محادثة جديدة» (admin and sales): type a family's WhatsApp number, open its chat (E.164 in the URL,
 * like a lead's «افتح المحادثة»). A number without messages opens NewThread: the first template.
 * A disclosure, so the conversations list keeps the column.
 */
export function NewChatForm({ onOpen }: { onOpen: (phone: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  // Folded by default (the list stays first); open while a number is being typed or refused.
  return (
    <details
      className="group mb-3 border-b border-rule pb-3"
      open={Boolean(value || error) || undefined}
    >
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-lapis sm:min-h-0">
        <Icon name="plus" />
        {t.inbox.newChat.title}
      </summary>
      <form
        aria-label={t.inbox.newChat.title}
        className="mt-2 grid gap-2"
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
        <Field
          label={t.inbox.newChat.phone}
          hint={error ? undefined : t.inbox.newChat.hint}
          error={error}
        >
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
    </details>
  );
}
