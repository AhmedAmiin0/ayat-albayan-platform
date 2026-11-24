import { type Href, router } from 'expo-router';
import { useHolds, t, useTheme, Button, IconButton } from '@ab/mobile-kit';
import { CheckPersonIcon } from '@/inbox/shared/chat-icons';

/**
 * The registration-check button in a sales header (the chat thread, the students tab): opens the
 * check. Only once /auth/me lists students.check_registration; nothing otherwise. `icon`: a 44pt
 * icon button with the same spoken name, for the one-line chat header.
 */
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
