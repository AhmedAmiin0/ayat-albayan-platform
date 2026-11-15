import { type Href, router } from 'expo-router';
import { usePermissions, t, Button } from '@ab/mobile-kit';

/** «تسجيلات الحلقات»: opens the recordings screen; hidden for a role without recordings.read. */
export function RecordingsButton({ href }: { href: Href }) {
  const can = usePermissions();
  if (!can('recordings.read')) return null;
  return <Button variant="secondary" label={t.mobileStudentFile.recordings.button} onPress={() => router.push(href)} />;
}
