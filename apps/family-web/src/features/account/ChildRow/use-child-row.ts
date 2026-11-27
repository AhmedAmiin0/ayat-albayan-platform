import { useChildTeacher } from '@/features/account/use-child-teacher';
import type { Props } from './ChildRow.types';

export function useChildRow({ student }: Pick<Props, 'student'>) {
  const teacher = useChildTeacher(student.id);
  return { teacher };
}
