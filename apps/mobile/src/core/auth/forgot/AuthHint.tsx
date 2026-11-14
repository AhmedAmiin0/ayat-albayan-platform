import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';

/** A quiet line under a sign-in field («اسم المستخدم هو كود الطالب…»). */
export function AuthHint({ text }: { text: string }) {
  const { color } = useTheme();
  return (
    <AppText
      style={{
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs),
        color: color.ink2,
      }}
    >
      {text}
    </AppText>
  );
}
