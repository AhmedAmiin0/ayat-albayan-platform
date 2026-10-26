import type { MessageView } from '@ab/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { downloadLabel } from '../hooks/bubble-offers';
import { downloadFile, downloadProblem } from '../hooks/chat-tools';
import { useSmall } from './MessageMeta';

/**
 * «تنزيل» on a file chip (owner 2026-10-26): a fresh signed URL, handed to the phone's browser to save
 * (chat-tools). Shown only where the chip may open the file (MessageFile: never a teacher).
 */
export function DownloadLink({ message: m, phone }: { message: MessageView; phone: string }) {
  const { color } = useTheme();
  const small = useSmall();
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
