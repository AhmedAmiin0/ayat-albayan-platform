import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { CodeSignIn } from './CodeSignIn';

/**
 * The teacher's «الدخول برمز واتساب» inside the login screen (docs/46 A8). `onBack` returns to the
 * password form.
 */
export function TeacherCodeSignIn({ onBack }: { onBack: () => void }) {
  return (
    <CodeSignIn intro={t.teacherAuth.codeIntro}>
      <Button variant="ghost" label={t.teacherAuth.withPassword} onPress={onBack} />
    </CodeSignIn>
  );
}
