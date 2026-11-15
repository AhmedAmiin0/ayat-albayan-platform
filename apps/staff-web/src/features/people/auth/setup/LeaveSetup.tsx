import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { signOut } from '@/features/people/auth/sign-in';

/** «تسجيل الخروج» under the setup form: a teacher who does not want to finish now leaves. */
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
