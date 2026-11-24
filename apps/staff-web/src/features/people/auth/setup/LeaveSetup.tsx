import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { signOut } from '@ab/web-kit/auth/sign-in';

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
