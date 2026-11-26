import {
  childTabPill,
  childTabs,
  familyChatOn,
  portalViewer,
  readsOwn,
  type ChildTab,
} from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { FilterPills, t, usePublicConfig } from '@ab/mobile-kit';
import { chatHref } from '@/nav';
import { PackageBody } from '@/package';
import { useChildUnread } from '@/portal';
import { recordingsHref } from '@/recordings';
import { HistoryPanel } from '@/child/HistoryPanel';
import { UpcomingPanel } from '@/child/UpcomingPanel';
import { useTabMotion } from '@/child/use-tab-motion';

interface ChildBodyProps {
  student: PortalStudent;
  kind: PortalKind;
}

/** Recordings and chat have no panel: each opens its own screen. */
const PANEL: Record<ChildTab, (p: ChildBodyProps & { own: boolean }) => ReactNode> = {
  upcoming: (p) => <UpcomingPanel student={p.student} own={p.own} />,
  attended: (p) => <HistoryPanel student={p.student} status="attended" />,
  absent: (p) => <HistoryPanel student={p.student} status="absent" />,
  package: (p) => <PackageBody student={p.student} />,
  recordings: () => null,
  chat: () => null,
};

/** Package tab only for a viewer who sees money; chat only while family_chat_enabled is on. */
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
        items={tabs.map((value) => childTabPill(value, { own, unread }, t))}
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
