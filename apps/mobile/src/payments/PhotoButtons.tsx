import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { useUploadMaxBytes } from '@/core/lib/query/public-config';
import { Button } from '@/core/ui/primitives/Button';
import { pickReceipt, type Receipt, type ReceiptSource } from './receipt';

export interface PhotoButtonsProps {
  camera: string;
  library: string;
  /** Said when the photo is over the bucket's limit. */
  tooLarge: string;
  onPicked: (receipt: Receipt) => void;
}

/**
 * The camera and the gallery side by side (the payment form's picker, R-MOB-02): a photo over the
 * bucket's limit is refused here, before any upload.
 */
export function PhotoButtons({ camera, library, tooLarge, onPicked }: PhotoButtonsProps) {
  const [error, setError] = useState<string>();
  const maxBytes = useUploadMaxBytes();

  async function pick(source: ReceiptSource) {
    setError(undefined);
    try {
      const picked = await pickReceipt(source);
      if (!picked) return;
      if (picked.size > maxBytes) setError(tooLarge);
      else onPicked(picked);
    } catch {
      setError(t.common.error);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" label={camera} onPress={() => void pick('camera')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" label={library} onPress={() => void pick('library')} />
        </View>
      </View>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
