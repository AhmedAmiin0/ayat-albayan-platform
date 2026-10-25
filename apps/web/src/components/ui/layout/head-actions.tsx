import type { ReactNode } from 'react';
import { MoreMenu } from '../overlay/more-menu';
import { usePhone } from './use-narrow';

export interface HeadActionsProps {
  /** The page's ONE primary action (a filled button), always in view. */
  primary?: ReactNode;
  /** Secondary actions: inline from 640px, behind «⋯ المزيد» on phones. */
  more?: ReactNode;
  /** Names the group (e.g. the dashboard's quick actions). */
  label?: string;
}

/**
 * A page head's actions (owner, 2026-10-05: "simpler"): the secondary ones, then the primary at
 * the inline-end. On phones (< 640px) only the primary and a «⋯» stay in the head.
 */
export function HeadActions({ primary, more, label }: HeadActionsProps) {
  const phone = usePhone();
  return (
    <div role={label ? 'group' : undefined} aria-label={label} className="ms-auto flex flex-wrap items-center gap-2.5">
      {more && (phone ? <MoreMenu>{more}</MoreMenu> : more)}
      {primary}
    </div>
  );
}
