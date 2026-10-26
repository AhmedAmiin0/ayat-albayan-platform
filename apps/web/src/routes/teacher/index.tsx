import { createFileRoute } from '@tanstack/react-router';
import { TeacherDashboard } from '@/features/teaching/teacher/TeacherDashboard';

/** /teacher — today / this week, join link, my students, my availability (R-TCH-03, R-SCH-08). */
export const Route = createFileRoute('/teacher/')({ component: TeacherDashboard });
