import { t, Button, CodeSignIn } from '@ab/mobile-kit';

/** docs/46 A8: onBack returns to the password form. */
export function TeacherCodeSignIn({ onBack }: { onBack: () => void }) {
  return (
    <CodeSignIn intro={t.teacherAuth.codeIntro}>
      <Button variant="ghost" label={t.teacherAuth.withPassword} onPress={onBack} />
    </CodeSignIn>
  );
}
