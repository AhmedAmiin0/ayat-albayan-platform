import { childTabs, type ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { FilterPills, t } from '@ab/mobile-kit';
import { PackageBody } from '@/package';
import { HistoryPanel } from './HistoryPanel';
import { tabWord } from './tab-words';
import { UpcomingPanel } from './UpcomingPanel';
import { useTabMotion } from './use-tab-motion';

interface ChildBodyProps {
  student: PortalStudent;
  kind: PortalKind;
}

/** Each tab's panel; «المحادثة» stays off until family_chat_enabled and its screens exist. */
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
 */
export function ChildBody({ student, kind }: ChildBodyProps) {
  // Chat screens are not built yet (owner 2026-11-15): the tab stays hidden whatever the setting.
  const tabs = childTabs({ kind, student, chatOn: false });
  const [tab, setTab] = useState<ChildTab>('upcoming');
  const motion = useTabMotion();
  const choose = (next: ChildTab): void => {
    setTab(next);
    motion.play();
  };
  return (
    <View style={{ gap: 16 }}>
      <FilterPills
        items={tabs.map((value) => ({ value, label: tabWord(value, kind) }))}
        value={tab}
        onChange={choose}
        accessibilityLabel={t.portal.childTabs}
      />
      <Animated.View style={[{ gap: 16 }, motion.style]}>
        {PANEL[tab]({ student, kind })}
      </Animated.View>
    </View>
  );
}
