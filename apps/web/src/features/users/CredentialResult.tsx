import type { IssuedCredential } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';

const R = t.users.result;

export interface CredentialResultProps {
  title: string;
  /** null = the admin typed the password: nothing to show. */
  credential: IssuedCredential | null;
  onClose: () => void;
}

/**
 * The password or invite link, shown ONCE: it lives in the caller's state only (never the query
 * cache or storage) and is gone when this closes. The copy button is the way to keep it.
 */
export function CredentialResult({ title, credential, onClose }: CredentialResultProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential.value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Dialog
      title={title}
      onClose={onClose}
      actions={
        <Button type="button" onClick={onClose}>
          {R.close}
        </Button>
      }
    >
      {credential ? (
        <div className="grid gap-3">
          <p role="alert" className="text-sm text-ink">
            {R.once}
          </p>
          <span className="text-xs font-semibold text-ink-2">{credential.kind === 'password' ? R.password : R.link}</span>
          <output dir="ltr" data-testid="issued-credential" className="block break-all rounded-md border border-rule bg-sunk px-3 py-2.5 font-mono text-sm text-ink select-all">
            {credential.value}
          </output>
          <Button type="button" variant="secondary" className="justify-self-start" onClick={() => void copy()}>
            {copied ? R.copied : R.copy}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-ink">{R.setDone}</p>
      )}
    </Dialog>
  );
}
