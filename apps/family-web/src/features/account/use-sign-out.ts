import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { signOut } from '@ab/web-kit/auth';

/** «تسجيل الخروج»: this browser's push and the session go (kit signOut), then the sign-in. */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => signOut(queryClient),
    onSettled: () => navigate({ to: '/login' }),
  });
}
