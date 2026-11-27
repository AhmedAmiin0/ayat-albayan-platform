import { LoadState } from '@/ui';
import { Upcoming } from './Upcoming';
import type { UpcomingPanelProps } from './UpcomingPanel.types';
import { useUpcomingPanel } from './use-upcoming-panel';

export function UpcomingPanel({ student, own }: UpcomingPanelProps) {
  const { lessons } = useUpcomingPanel(student.id);
  return (
    <LoadState query={lessons}>
      {(data) => <Upcoming lessons={data} student={student} own={own} />}
    </LoadState>
  );
}
