import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { signOut } from '@/features/auth/sign-in';
import { t } from '@/lib/i18n';

/** «تسجيل الخروج» icon button (the door glyph is drawn RTL-native). Visible at every width. */
export function LogoutButton({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return (
    <IconButton
      label={t.auth.logout}
      className={className}
      onClick={async () => {
        await signOut(queryClient);
        await navigate({ to: '/login' });
      }}
    >
      <Icon name="logout" />
    </IconButton>
  );
}
