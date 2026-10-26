import { useState } from 'react';
import { Linking, View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';

const R = t.mobileStudentFile.recordings;

/**
 * «تشغيل»: asks for a fresh 1-hour link on every tap (`getUrl`, the list's refetch) and hands it to
 * the system player through Linking (no in-app player: that needs a new native module).
 */
export function RecordingPlay({ when, getUrl }: { when: string; getUrl: () => Promise<string | null> }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const play = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const url = await getUrl();
      if (!url) throw new Error('no_url');
      await Linking.openURL(url);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 4, alignItems: 'flex-start' }}>
      <Button
        variant="secondary"
        label={R.play}
        accessibilityLabel={R.playOf.replace('{when}', when)}
        busy={busy}
        onPress={() => void play()}
      />
      {failed ? <ErrorLine message={R.playFailed} /> : null}
    </View>
  );
}
