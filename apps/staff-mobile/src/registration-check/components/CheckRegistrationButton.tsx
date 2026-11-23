import { type Href, router } from 'expo-router';
import { useHolds, t, useTheme, Button, IconButton } from '@ab/mobile-kit';
import { CheckPersonIcon } from '@/inbox/shared/chat-icons';

/** Shown only once /auth/me lists students.check_registration. */
export function CheckRegistrationButton({ href, icon = false }: { href: Href; icon?: boolean }) {
  const { color } = useTheme();
  const allowed = useHolds('students.check_registration');
  if (!allowed) return null;
  if (icon) {
    return (
      <IconButton label={t.registrationCheck.action} onPress={() => router.push(href)}>
        <CheckPersonIcon color={color.lapis} />
      </IconButton>
    );
  }
  return (
    <Button variant="ghost" label={t.registrationCheck.action} onPress={() => router.push(href)} />
  );
}
