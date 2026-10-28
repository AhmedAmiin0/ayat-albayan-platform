import type { MessageView } from '@ab/shared';
import { useCallback } from 'react';
import type { AccessibilityActionEvent, AccessibilityActionInfo, GestureResponderEvent } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useBubbleChatActions } from '../../thread/hooks/chat-actions';
import { useThreadMode } from '../../thread/hooks/thread-mode';
import { bubbleOffers, offersAny } from './bubble-offers';

interface BubbleA11y {
  accessible?: boolean;
  accessibilityHint?: string;
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (e: AccessibilityActionEvent) => void;
}

export interface BubbleActions {
  /** «رد», «نسخ النص», «إعادة توجيه» or «تنزيل» applies: the bubble opens the menu on a long press. */
  has: boolean;
  /** `at` = the bubble's window y (the reaction row floats above it). */
  openMenu: (at?: number) => void;
  /** Swipe to answer: only while free text can go out. */
  swipe: (() => void) | undefined;
  /** For the bubble's text: a screen reader gets the same actions without the gesture. */
  a11y: BubbleA11y;
}

/** The held element's top in the window (the touch's pageY less its offset in it); none without a real touch. */
export function holdTop(e?: GestureResponderEvent): number | undefined {
  const n = e?.nativeEvent;
  return typeof n?.pageY === 'number' && typeof n.locationY === 'number' ? n.pageY - n.locationY : undefined;
}

/** What one bubble offers (owner 2026-10-25). Off outside a chat screen (no ChatActionsProvider). */
export function useBubbleActions(m: MessageView): BubbleActions {
  const { enabled, canSend, setReply, openMenu, openForward, reactable } = useBubbleChatActions();
  const offers = bubbleOffers(m, { enabled, teacher: useThreadMode().kind === 'teacher', react: reactable(m) });
  const { reply, forward } = offers;
  const answer = useCallback(() => setReply(m), [setReply, m]);
  const actions: AccessibilityActionInfo[] = [
    ...(reply && canSend ? [{ name: 'reply', label: t.inbox.reply.action }] : []),
    ...(forward ? [{ name: 'forward', label: t.inbox.forward.action }] : []),
    // «تفاعل» without the long press: the menu, with the reaction row on top.
    ...(offers.react ? [{ name: 'react', label: t.inbox.reactions.react }] : []),
    { name: 'longpress', label: t.inbox.reply.menu },
  ];
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'reply') answer();
    else if (e.nativeEvent.actionName === 'forward') openForward(m);
    else openMenu(m);
  };
  const has = offersAny(offers);
  return {
    has,
    openMenu: (at?: number) => openMenu(m, at),
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
