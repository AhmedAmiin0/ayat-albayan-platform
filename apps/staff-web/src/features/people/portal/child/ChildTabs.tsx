import type { ChildTab } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { Tabs, type TabOption, portalUnreadQuery, t } from '@ab/web-kit';

export const CHILD_TABS_PREFIX = 'portal';

const LABEL: Record<ChildTab, () => string> = {
  upcoming: () => t.portal.upcomingTab,
  attended: () => t.portal.attendedTab,
  absent: () => t.portal.absentTab,
  recordings: () => t.lessonFiles.recordings,
  package: () => t.portal.packageTab,
  chat: () => t.studentChannel.portalTab,
};

interface Props {
  tabs: ChildTab[];
  studentId: string;
  value: ChildTab;
  onChange: (tab: ChildTab) => void;
}

const options = (tabs: ChildTab[], unread: number): TabOption<ChildTab>[] =>
  tabs.map((tab) => ({
    value: tab,
    label: tab === 'chat' && unread > 0 ? `${LABEL.chat()} (${String(unread)})` : LABEL[tab](),
  }));

function Strip({ tabs, value, onChange, unread }: Omit<Props, 'studentId'> & { unread: number }) {
  return (
    <Tabs
      label={t.portal.childTabs}
      tabs={options(tabs, unread)}
      value={value}
      onChange={onChange}
      idPrefix={CHILD_TABS_PREFIX}
    />
  );
}

/** Unread is read only while the tab exists. */
function ChatStrip(props: Props) {
  const unread = useQuery(portalUnreadQuery(props.studentId)).data?.unread ?? 0;
  return <Strip {...props} unread={unread} />;
}

/** The child screen's tabs (@ab/client-core childTabs decides which). */
export function ChildTabs(props: Props) {
  if (props.tabs.includes('chat')) return <ChatStrip {...props} />;
  return <Strip {...props} unread={0} />;
}
