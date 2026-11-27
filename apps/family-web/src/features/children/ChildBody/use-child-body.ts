import { useNavigate } from '@tanstack/react-router';
import { tabIds } from '@ab/web-kit';
import type { OpenReport } from '@ab/web-kit';
import { shownTab, tabOptions } from '@/features/children/child-tabs';
import { useChatTab } from '@/features/children/use-chat-tab';
import type { Props } from './ChildBody.types';
import { PREFIX } from './child-body.helpers';

export function useChildBody({ student, kind, tab }: Pick<Props, 'student' | 'kind' | 'tab'>) {
  const navigate = useNavigate();
  const tabs = tabOptions(kind, student, useChatTab(student.id));
  const shown = shownTab(tabs, tab);
  const ids = tabIds(PREFIX, shown);
  const open = (report: OpenReport) =>
    void navigate({
      to: '/report/$reportId',
      params: { reportId: report.reportId },
      search: { studentId: student.id, recording: report.recordingId ?? undefined },
    });
  const openLesson = (lessonId: string) =>
    void navigate({
      to: '/lesson/$lessonId',
      params: { lessonId },
      search: { studentId: student.id },
    });
  return { tabs, shown, ids, open, openLesson };
}
