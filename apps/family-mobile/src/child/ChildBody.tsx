import { childTabs, familyChatOn, type ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { FilterPills, t, usePublicConfig } from '@ab/mobile-kit';
import { chatHref } from '@/nav';
import { PackageBody } from '@/package';
import { HistoryPanel } from './HistoryPanel';
import { tabWord } from './tab-words';
import { UpcomingPanel } from './UpcomingPanel';
import { useTabMotion } from './use-tab-motion';

interface ChildBodyProps {
  student: PortalStudent;
  kind: PortalKind;
}

/** Each tab's panel; «المحادثة» has none: it opens its own screen (chat/[id]). */
const PANEL: Record<ChildTab, (p: ChildBodyProps) => ReactNode> = {
  upcoming: (p) => <UpcomingPanel student={p.student} own={p.kind === 'student'} />,
  attended: (p) => <HistoryPanel student={p.student} status="attended" />,
  absent: (p) => <HistoryPanel student={p.student} status="absent" />,
  package: (p) => <PackageBody student={p.student} />,
  chat: () => null,
};

/**
 * One child's page body (docs/50 §6, canvas Child): «القادمة» · «حضرها» · «غاب عنها» · «الباقة»
 * (the last only for a viewer who sees money: @ab/client-core childTabs). The panel animates in.
 * «المحادثة» only while settings.family_chat_enabled is on (off while the settings load or fail),
 * for every login, a child's own too (owner 2026-11-16).
 */
export function ChildBody({ student, kind }: ChildBodyProps) {
  const chatOn = familyChatOn(usePublicConfig());
  const tabs = childTabs({ kind, student, chatOn });
  const [tab, setTab] = useState<ChildTab>('upcoming');
  const motion = useTabMotion();
  const show = (next: ChildTab): void => {
    setTab(next);
    motion.play();
  };
  // A pill swaps the panel; «المحادثة» pushes the chat screen above the child's page.
  const pick: Record<ChildTab, (next: ChildTab) => void> = {
    upcoming: show,
    attended: show,
    absent: show,
    package: show,
    chat: () => router.push(chatHref(student.id)),
  };
  return (
    <View style={{ gap: 16 }}>
      <FilterPills
        items={tabs.map((value) => ({ value, label: tabWord(value, kind) }))}
        value={tab}
        onChange={(next) => pick[next](next)}
        accessibilityLabel={t.portal.childTabs}
      />
      <Animated.View style={[{ gap: 16 }, motion.style]}>
        {PANEL[tab]({ student, kind })}
      </Animated.View>
    </View>
  );
}
