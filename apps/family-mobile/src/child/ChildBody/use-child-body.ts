import { childTabPill, childTabs, familyChatOn, portalViewer, readsOwn } from '@ab/client-core';
import type { ChildTab } from '@ab/client-core';
import { router } from 'expo-router';
import { useState } from 'react';
import { t, usePublicConfig } from '@ab/mobile-kit';
import { chatHref } from '@/nav';
import { useChildUnread } from '@/portal';
import { recordingsHref } from '@/recordings';
import { useTabMotion } from '@/child/use-tab-motion';
import type { ChildBodyProps } from './ChildBody.types';

/** Package tab only for a viewer who sees money; chat only while family_chat_enabled is on. */
export function useChildBody({ student, kind }: ChildBodyProps) {
  const chatOn = familyChatOn(usePublicConfig());
  const tabs = childTabs({ kind, student, chatOn });
  const own = readsOwn(portalViewer(kind, student));
  const unread = useChildUnread(student.id, chatOn).data?.unread ?? 0;
  const [tab, setTab] = useState<ChildTab>('upcoming');
  const motion = useTabMotion();
  const show = (next: ChildTab): void => {
    setTab(next);
    motion.play();
  };
  const pick: Record<ChildTab, (next: ChildTab) => void> = {
    upcoming: show,
    attended: show,
    absent: show,
    package: show,
    recordings: () => router.push(recordingsHref(student.id)),
    chat: () => router.push(chatHref(student.id)),
  };
  const items = tabs.map((value) => childTabPill(value, { own, unread }, t));
  const choose = (next: ChildTab): void => pick[next](next);
  return { items, tab, choose, own, motionStyle: motion.style };
}
