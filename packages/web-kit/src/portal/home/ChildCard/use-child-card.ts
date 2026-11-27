import { useQuery } from '@tanstack/react-query';
import { portalLessonsQuery } from '@ab/web-kit/portal/api';
import type { ChildCardProps } from './ChildCard.types';

export function useChildCard({ student }: Pick<ChildCardProps, 'student'>) {
  const lessons = useQuery(portalLessonsQuery(student.id));
  return { lessons };
}
