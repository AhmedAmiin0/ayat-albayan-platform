import { createFileRoute } from '@tanstack/react-router';
import { AdminSessions } from '@/features/classroom/AdminSessions';

/** /admin/classrooms — the day's lessons of every teacher with «ادخل الحلقة» and «ابعت لينك الحلقة». */
export const Route = createFileRoute('/admin/(ops)/classrooms')({ component: AdminSessions });
