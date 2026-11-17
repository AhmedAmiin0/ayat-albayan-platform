import {
  childTabs,
  childTabWord,
  familyChatOn,
  portalViewer,
  readsOwn,
  type ChildTab,
} from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { type FilterPill, FilterPills, t, usePublicConfig } from '@ab/mobile-kit';
import { chatHref } from '@/nav';
import { PackageBody } from '@/package';
import { useChildUnread } from '@/portal';
import { recordingsHref } from '@/recordings';
import { HistoryPanel } from './HistoryPanel';
import { UpcomingPanel } from './UpcomingPanel';
import { useTabMotion } from './use-tab-motion';

interface ChildBodyProps {
  student: PortalStudent;
  kind: PortalKind;
}

/** Each tab's panel; «التسجيلات» and «المحادثة» have none: each opens its own screen. */
const PANEL: Record<ChildTab, (p: ChildBodyProps & { own: boolean }) => ReactNode> = {
  upcoming: (p) => <UpcomingPanel student={p.student} own={p.own} />,
  attended: (p) => <HistoryPanel student={p.student} status="attended" />,
  absent: (p) => <HistoryPanel student={p.student} status="absent" />,
  package: (p) => <PackageBody student={p.student} />,
  recordings: () => null,
  chat: () => null,
};

/** A tab's pill; «المحادثة» carries its unread badge (canvas ChatXFamilyEntry). */
function pill(value: ChildTab, own: boolean, unread: number): FilterPill<ChildTab> {
  const label = childTabWord(value, own, t);
  if (value !== 'chat') return { value, label };
  const named = t.portal.app.child.chatUnread.replace('{n}', String(unread));
  return { value, label, badge: { count: unread, label: named } };
}

/**
 * One child's page body (docs/50 §6, canvas Child): «القادمة» · «حضرها» · «غاب عنها» · «الباقة»
 * (the last only for a viewer who sees money: @ab/client-core childTabs). The panel animates in.
 * «المحادثة» only while settings.family_chat_enabled is on (off while the settings load or fail),
 * for every login, a child's own too (owner 2026-11-16), as the last pill with its unread count;
 * the pills fit one row (canvas ChatXFamilyEntry). «التسجيلات» opens the child's recordings.
 */
export function ChildBody({ student, kind }: ChildBodyProps) {
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
  // A pill swaps the panel; «التسجيلات» and «المحادثة» push their screen above the child's page.
  const pick: Record<ChildTab, (next: ChildTab) => void> = {
    upcoming: show,
    attended: show,
    absent: show,
    package: show,
    recordings: () => router.push(recordingsHref(student.id)),
    chat: () => router.push(chatHref(student.id)),
  };
  return (
    <View style={{ gap: 16 }}>
      <FilterPills
        fit
        items={tabs.map((value) => pill(value, own, unread))}
        value={tab}
        onChange={(next) => pick[next](next)}
        accessibilityLabel={t.portal.childTabs}
      />
      <Animated.View style={[{ gap: 16 }, motion.style]}>
        {PANEL[tab]({ student, kind, own })}
      </Animated.View>
    </View>
  );
}
