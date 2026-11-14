import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { KeyboardFrame } from '@/core/ui/layout/KeyboardFrame';
import { AppText } from '@/core/ui/primitives/AppText';
import { Mark } from '@/core/ui/primitives/Mark';
import { type, useTheme } from '@/theme';

interface SignInFrameProps {
  title: string;
  /** One line under the title. */
  subtitle?: string;
  children: ReactNode;
}

// docs/07 §12: mobile drops the binding cover, frame and cartouche; it keeps the mark, Amiri title,
// 16pt inputs and one lapis button. Both apps' sign-in screens (staff /login, the family's).
export function SignInFrame({ title, subtitle, children }: SignInFrameProps) {
  const { color } = useTheme();
  return (
    // The route's root, at the window's top; Android too (edge to edge, the window is not resized).
    <KeyboardFrame inScreen={false} style={{ flex: 1, backgroundColor: color.margin }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
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
        {children}
      </ScrollView>
    </KeyboardFrame>
  );
}
