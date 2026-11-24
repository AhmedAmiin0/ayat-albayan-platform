import type { Tone } from '@ab/money';
import { Dot, Pill } from './pill';

type Look = 'pill' | 'dot';

/** Needs the family (act) or went wrong (bad): a tinted pill; done or passive: a dot. */
const LOOK: Readonly<Record<Tone, Look>> = { act: 'pill', bad: 'pill', ok: 'dot', neutral: 'dot' };

export interface StatusMarkProps {
  tone: Tone;
  label: string;
  /** A dot whose state just turned on pops in once. */
  live?: boolean;
  className?: string;
}

/** A status word in the look its tone asks for (owner 2026-11-19, see pill.tsx). */
export function StatusMark({ tone, label, live, className }: StatusMarkProps) {
  if (LOOK[tone] === 'pill') return <Pill tone={tone} className={className}>{label}</Pill>;
  return (
    <Dot tone={tone} live={live} className={className}>
      {label}
    </Dot>
  );
}
