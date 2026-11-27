import type { ReactNode } from 'react';

export type Check = (identifier: string) => string | null;

export interface IdentifierProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The quiet hint, or (red) what is wrong. */
  note: { text: string; bad: boolean } | null;
}

export interface PasswordSignInProps {
  label: string;
  /** A quiet line under the identifier. */
  hint?: string;
  children?: ReactNode;
  /** While typing: why the identifier cannot be right (shown; the button waits), or null. */
  check?: Check;
  /** After each try: signed in or refused (the family app's haptic). */
  onResult?: (ok: boolean) => void;
}
