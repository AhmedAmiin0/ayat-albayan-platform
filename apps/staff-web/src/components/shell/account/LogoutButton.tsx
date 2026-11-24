import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { IconButton } from '@ab/web-kit/components/ui/form/icon-button';
import { signOut } from '@ab/web-kit/auth/sign-in';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** The door glyph is drawn RTL-native; visible at every width. */
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
