import { createFileRoute } from '@tanstack/react-router';
import { TeacherDashboard } from '@/features/teaching/teacher';

/** No search: a stale ?tab= from an old link is ignored (R-TCH-03, docs/48). */
export const Route = createFileRoute('/teacher/')({ component: TeacherDashboard });
