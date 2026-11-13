import type { TeacherPage } from '@ab/shared';
import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { useTeacherPageState, type TeacherPageState } from '@/lib/settings/teacher-pages';

type Props = { page: TeacherPage; children: ReactNode };

/**
 * A teacher page behind its academy switch (owner 2026-11-13): a skeleton until the settings
 * answer, the page when on, back to /teacher when off (a typed link, a bookmark, a notification).
 */
export function TeacherPageGate({ page, children }: Props) {
  const state = useTeacherPageState(page);
  const view: Record<TeacherPageState, ReactNode> = {
    loading: <ListSkeleton />,
    on: children,
    off: <Navigate to="/teacher" replace />,
  };
  return view[state];
}
