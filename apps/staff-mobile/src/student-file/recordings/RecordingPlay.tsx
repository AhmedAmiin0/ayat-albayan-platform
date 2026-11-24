import { useState } from 'react';
import { Linking, View } from 'react-native';
import { t, Button, ErrorLine } from '@ab/mobile-kit';

const R = t.mobileStudentFile.recordings;

/** Asks for a fresh 1-hour link on every tap and hands it to the system player. */
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
    <View style={{ gap: 4 }}>
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
