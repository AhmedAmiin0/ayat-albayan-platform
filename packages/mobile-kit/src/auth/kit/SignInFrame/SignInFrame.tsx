import { ScrollView } from 'react-native';
import { KeyboardFrame } from '../../../ui/layout/KeyboardFrame';
import { useTheme } from '../../../theme';
import type { SignInFrameProps } from './SignInFrame.types';
import { MarkHeader } from './MarkHeader';

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
