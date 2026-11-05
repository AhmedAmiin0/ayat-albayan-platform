import type { Href } from 'expo-router';
import { type Can, canOpen, type GateStatus } from '@/core/auth';

// docs/38 §mobile 2: the root /share screen hands the share to the signed-in tree's own chooser,
// inside its chat group (its thread mode and link base). null: no chats to share into.

const none = (): null => null;

const CHOOSER: Record<GateStatus, (can: Can) => Href | null> = {
  admin: () => '/inbox/share',
  // As a tapped push (toSalesThread): the chats only with inbox.read.
  sales: (can) => (canOpen(can, 'inbox') ? '/sales/inbox/share' : null),
  teacher: () => '/teacher/chats/share',
  assistant: none,
  booting: none,
  out: none,
};

/** The tree's share chooser, or null (the classroom assistant, a salesperson without the chats). */
export function shareHref(gate: GateStatus, can: Can): Href | null {
  return CHOOSER[gate](can);
}

const HOME: Partial<Record<GateStatus, Href>> = {
  assistant: '/assistant/lessons',
  sales: '/sales/more',
};

/** «رجوع» when there is nothing to share into: the tree's own landing (never the admin's tabs). */
export function shareHome(gate: GateStatus): Href {
  return HOME[gate] ?? '/';
}
