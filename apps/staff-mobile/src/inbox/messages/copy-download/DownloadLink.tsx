import type { MessageView } from '@ab/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t, shape, type, useTheme, AppText, useSmallText } from '@ab/mobile-kit';
import { downloadLabel } from '@/inbox/messages/hooks/bubble-offers';
import { downloadFile, downloadProblem } from './chat-tools';

/** A fresh signed URL each time; shown only where the chip may open the file, never teachers. */
export function DownloadLink({ message: m, phone }: { message: MessageView; phone: string }) {
  const { color } = useTheme();
  const small = useSmallText();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await downloadFile({ phone, messageId: m.id });
    } catch (e) {
      setProblem(downloadProblem(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={downloadLabel(m)}
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={() => void run()}
        style={{ minHeight: shape.control.touch, justifyContent: 'center' }}
      >
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.lapis }}>
          {busy ? t.inbox.download.busy : t.inbox.download.action}
        </AppText>
      </Pressable>
      {problem ? <AppText accessibilityRole="alert" style={small}>{problem}</AppText> : null}
    </View>
  );
}
