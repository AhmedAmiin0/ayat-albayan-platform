import { createFileRoute } from '@tanstack/react-router';
import { MyReports } from '@/features/teacher/MyReports';

/** /teacher/reports — pending, sent (edit window) and my students' history (R-REP-01/02/05). */
export const Route = createFileRoute('/teacher/reports/')({ component: MyReports });
