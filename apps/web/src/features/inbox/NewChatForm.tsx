import { normalizePhone } from '@ab/shared';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n';

/**
 * «محادثة جديدة» (admin and sales): type a family's WhatsApp number, open its chat (E.164 in the URL,
 * like a lead's «افتح المحادثة»). A number without messages opens NewThread: the first template.
 * Opened by NewChatToggle in the list's head row, so the conversations list keeps the column.
 */
export function NewChatForm({ onOpen }: { onOpen: (phone: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const box = useRef<HTMLInputElement>(null);
  // Unfolded by the toggle: the number box takes the focus.
  useEffect(() => box.current?.focus(), []);
  return (
    <div className="mb-3 border-b border-rule pb-3">
      <form
        aria-label={t.inbox.newChat.title}
        className="grid gap-2"
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
              ref={box}
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
    </div>
  );
}

/** «محادثة جديدة» as an icon-only disclosure in the list's head row; the form unfolds below the row. */
export function NewChatToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <IconButton label={t.inbox.newChat.title} aria-expanded={open} onClick={onToggle} className="text-lapis aria-expanded:bg-sunk">
      <Icon name="plus" />
    </IconButton>
  );
}
