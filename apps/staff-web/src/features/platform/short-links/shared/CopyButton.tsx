import { useState } from 'react';
import { Icon, Button, IconButton, Toast, t } from '@ab/web-kit';

interface CopyButtonProps {
  text: string;
  /** The accessible name (and the words, with `wide`). */
  label: string;
  /** A labelled secondary button instead of the bare icon. */
  wide?: boolean;
}

/** A blocked clipboard changes nothing on screen. */
export function CopyButton({ text, label, wide }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };
  const button = wide ? (
    <Button type="button" variant="secondary" size="sm" onClick={copy}>
      <Icon name="copy" />
      {label}
    </Button>
  ) : (
    <IconButton label={label} onClick={copy} className="size-11 sm:size-7">
      <Icon name="copy" />
    </IconButton>
  );
  return (
    <>
      {button}
      {copied && (
        <Toast message={t.shortLinks.detail.copied} onDismiss={() => setCopied(false)} />
      )}
    </>
  );
}
