import { useNavigate, useRouter } from '@tanstack/react-router';
import type { OpenReport } from '@ab/web-kit/portal';

/**
 * The lesson and recordings pages' ways out: «العودة» goes back, or home when the page was the
 * first one (a pasted link), never out of the app; a report opens on its own page.
 */
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
