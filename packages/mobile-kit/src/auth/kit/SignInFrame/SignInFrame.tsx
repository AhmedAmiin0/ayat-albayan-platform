import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { KeyboardFrame } from '../../../ui/layout/KeyboardFrame';
import { AppText } from '../../../ui/primitives/AppText';
import { Mark } from '../../../ui/primitives/Mark';
import { type, useTheme } from '../../../theme';

interface SignInFrameProps {
  title: string;
  /** One line under the title. */
  subtitle?: string;
  children: ReactNode;
  /** The app's own top (the family app's mark + wordmark + welcome); none: the staff mark and
   *  title. */
  header?: ReactNode;
}

/** The academy's mark, the title in Noto Sans Arabic 700 and one line under it (staff /login). */
function MarkHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { color } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Mark size={56} labelled />
      <AppText
        accessibilityRole="header"
        style={{
          fontFamily: type.display,
          fontSize: type.size.h2,
          lineHeight: type.lineHeight(type.size.h2, true),
          color: color.ink,
          textAlign: 'center',
        }}
      >
        {title}
      </AppText>
      {subtitle ? (
        <AppText style={{ color: color.ink2, textAlign: 'center' }}>{subtitle}</AppText>
      ) : null}
    </View>
  );
}

// docs/07 §12: mobile drops the binding cover, frame and cartouche; it keeps the mark, Amiri title,
// 16pt inputs and one lapis button. Both apps' sign-in screens (staff /login, the family's).
export function SignInFrame({ title, subtitle, children, header }: SignInFrameProps) {
  const { color } = useTheme();
  return (
    // The route's root, at the window's top; Android too (edge to edge, the window is not resized).
    <KeyboardFrame inScreen={false} style={{ flex: 1, backgroundColor: color.margin }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {header ?? <MarkHeader title={title} subtitle={subtitle} />}
        {children}
      </ScrollView>
    </KeyboardFrame>
  );
}
