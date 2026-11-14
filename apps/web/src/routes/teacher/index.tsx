import { createFileRoute } from '@tanstack/react-router';
import { TeacherDashboard } from '@/features/teaching/teacher';

/**
 * /teacher «اليوم» — the hero and today's lessons only (R-TCH-03, docs/48; owner 2026-11-14).
 * No search: a stale ?tab=… from an old link is simply ignored.
 */
export const Route = createFileRoute('/teacher/')({ component: TeacherDashboard });
