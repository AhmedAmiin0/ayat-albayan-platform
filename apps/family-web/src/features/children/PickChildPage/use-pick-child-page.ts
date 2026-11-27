import { useNavigate } from '@tanstack/react-router';
import { useFamilyPick, usePickChild } from '@/features/shell';

export function usePickChildPage() {
  const navigate = useNavigate();
  const pickChild = usePickChild();
  const first = useFamilyPick().state === 'choose';
  const choose = (studentId: string) => {
    pickChild(studentId);
    void navigate({ to: '/portal' });
  };
  return { first, choose };
}
