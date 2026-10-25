import { canForward, canReply, type MessageView } from '@ab/shared';
import { useCallback } from 'react';
import type { AccessibilityActionEvent, AccessibilityActionInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useChatActions } from './thread/hooks/chat-actions';

export interface BubbleA11y {
  accessible?: boolean;
  accessibilityHint?: string;
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (e: AccessibilityActionEvent) => void;
}

export interface BubbleActions {
  /** «رد» or «إعادة توجيه» applies: the bubble opens the menu on a long press. */
  has: boolean;
  openMenu: () => void;
  /** Swipe to answer: only while free text can go out. */
  swipe: (() => void) | undefined;
  /** For the bubble's text: a screen reader gets the same actions without the gesture. */
  a11y: BubbleA11y;
}

/** What one bubble offers (owner 2026-10-25). Off outside a chat screen (no ChatActionsProvider). */
export function useBubbleActions(m: MessageView): BubbleActions {
  const { enabled, canSend, setReply, openMenu, openForward } = useChatActions();
  const reply = enabled && canReply(m);
  const forward = enabled && canForward(m);
  const answer = useCallback(() => setReply(m), [setReply, m]);
  const actions: AccessibilityActionInfo[] = [
    ...(reply && canSend ? [{ name: 'reply', label: t.inbox.reply.action }] : []),
    ...(forward ? [{ name: 'forward', label: t.inbox.forward.action }] : []),
    { name: 'longpress', label: t.inbox.reply.menu },
  ];
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'reply') answer();
    else if (e.nativeEvent.actionName === 'forward') openForward(m);
    else openMenu(m);
  };
  const has = reply || forward;
  return {
    has,
    openMenu: () => openMenu(m),
    swipe: reply && canSend ? answer : undefined,
    a11y: has
      ? {
          accessible: true,
          accessibilityHint: t.inbox.reply.swipeHint,
          accessibilityActions: actions,
          onAccessibilityAction: onAction,
        }
      : {},
  };
}
