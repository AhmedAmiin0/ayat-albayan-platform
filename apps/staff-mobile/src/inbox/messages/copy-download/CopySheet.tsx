import { ScrollView } from 'react-native';
import { t, shape, type, useTheme, AppText, Button, Sheet } from '@ab/mobile-kit';
import { ContentText } from '@/core/ui/primitives/ContentText';
import type { CopyRequest } from './chat-tools';

interface CopySheetProps {
  /** What to copy; null hides the sheet. */
  request: CopyRequest | null;
  onClose: () => void;
}

/** The clipboard module is not wired here yet, so the OS text selection does the copying. */
export function CopySheet({ request, onClose }: CopySheetProps) {
  const { color } = useTheme();
  return (
    <Sheet
      open={request !== null}
      onClose={onClose}
      label={request?.title ?? t.inbox.copy.label}
      title={request?.title ?? t.inbox.copy.label}
      testID="copy-sheet"
    >
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 }}>
        {t.inbox.copy.hint}
      </AppText>
      {/* A long message scrolls: its end stays reachable to select. */}
      <ScrollView
        style={{ maxHeight: 320, borderRadius: shape.radius.md, backgroundColor: color.sunk }}
      >
        <ContentText
          testID="copy-text"
          source={request?.text ?? ''}
          selectable
          style={{
            padding: 12,
            fontFamily: type.ui[400],
            fontSize: type.size.body,
            lineHeight: type.lineHeight(type.size.body),
            color: color.ink,
          }}
        >
          {request?.text}
        </ContentText>
      </ScrollView>
      <Button variant="secondary" label={t.common.close} onPress={onClose} />
    </Sheet>
  );
}
