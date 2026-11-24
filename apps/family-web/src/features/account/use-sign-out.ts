import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { signOut } from '@ab/web-kit/auth/sign-in';

/** This browser's push and the session go, then the sign-in page. */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => signOut(queryClient),
    onSettled: () => navigate({ to: '/login' }),
  });
}
