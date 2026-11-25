import { normalizePhone } from '@ab/core';
import { useEffect, useRef, useState } from 'react';
import { Button, Field, Icon, IconButton, Input, t } from '@ab/web-kit';

/** A number without messages opens NewThread to send the first template. */
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

export function NewChatToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <IconButton label={t.inbox.newChat.title} aria-expanded={open} onClick={onToggle} className="text-lapis aria-expanded:bg-sunk">
      <Icon name="plus" />
    </IconButton>
  );
}
