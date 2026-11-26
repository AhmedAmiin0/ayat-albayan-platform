import { useStudentSignIn } from '@/features/sign-in/use-student-sign-in';

export function useStudentPasswordForm() {
  const form = useStudentSignIn();
  return { form };
}
