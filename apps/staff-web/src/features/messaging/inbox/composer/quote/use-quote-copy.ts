import { useState } from 'react';

/** Copies an offer text; `copied` says how it went until its toast is dismissed. */
export function useQuoteCopy() {
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);
  const write = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
  };
  return {
    copied,
    copy: (text: string) => void write(text),
    dismiss: () => setCopied(null),
  };
}
