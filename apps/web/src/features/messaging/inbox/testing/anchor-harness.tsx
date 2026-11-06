import { useState, type ReactNode } from 'react';
import { ChatAnchorContext } from '@/features/messaging/inbox/shared/chat-anchor';

// The inbox route's anchor (URL `msg`, docs/37) as plain state, for component tests (not app code).

interface AnchorHarnessProps {
  children: ReactNode;
  /** The URL's msg when the chat opens. */
  initial?: string;
  /** Every anchor move, as the route would get it. */
  onAnchor?: (id: string | undefined) => void;
}

export function AnchorHarness({ children, initial, onAnchor }: AnchorHarnessProps) {
  const [msg, setMsg] = useState(initial);
  const anchor = (id: string | undefined) => {
    onAnchor?.(id);
    setMsg(id);
  };
  return (
    <ChatAnchorContext value={{ msg, anchor, open: () => undefined }}>{children}</ChatAnchorContext>
  );
}
