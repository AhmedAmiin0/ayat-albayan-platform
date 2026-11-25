import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button, t, signOut } from '@ab/web-kit';

export function LeaveSetup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const leave = async () => {
    await signOut(queryClient);
    await navigate({ to: '/login' });
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="justify-self-start"
      onClick={() => void leave()}
    >
      {t.teacherAuth.setup.signOut}
    </Button>
  );
}
