import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Icon, IconButton, signOut, t } from '@ab/web-kit';

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
