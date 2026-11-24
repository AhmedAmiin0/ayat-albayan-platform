import { useNavigate, useRouter } from '@tanstack/react-router';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';

/** Back goes home when the page was the first one, never out of the app. */
export function useLessonNav(studentId: string) {
  const router = useRouter();
  const navigate = useNavigate();
  return {
    back: () =>
      router.history.canGoBack() ? router.history.back() : void navigate({ to: '/portal' }),
    openReport: (report: OpenReport) =>
      void navigate({
        to: '/report/$reportId',
        params: { reportId: report.reportId },
        search: { studentId, recording: report.recordingId ?? undefined },
      }),
  };
}
