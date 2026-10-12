import { type Href, router } from 'expo-router';
import { useHolds } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';

/**
 * «تحقق من التسجيل» in a sales header (the chat thread, the «الطلاب» tab): opens the registration
 * check. Only once /auth/me lists students.check_registration; nothing otherwise.
 */
export function CheckRegistrationButton({ href }: { href: Href }) {
  const allowed = useHolds('students.check_registration');
  if (!allowed) return null;
  return <Button variant="ghost" label={t.registrationCheck.action} onPress={() => router.push(href)} />;
}
