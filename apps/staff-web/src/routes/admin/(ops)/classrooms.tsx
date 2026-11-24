import { createFileRoute } from '@tanstack/react-router';
import { AdminSessions } from '@/features/teaching/classroom/sessions/AdminSessions';

export const Route = createFileRoute('/admin/(ops)/classrooms')({ component: AdminSessions });
