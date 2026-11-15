import { t, Button, CodeSignIn } from '@ab/mobile-kit';

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
