import { useEffect, useEffectEvent } from 'react';
import { BackHandler } from 'react-native';

/** Android's back closes the open search first (WhatsApp), not the chat. */
export function useSearchBack(open: boolean, close: () => void): void {
  const onBack = useEffectEvent(() => {
    close();
    return true;
  });
  useEffect(() => {
    if (!open) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [open]);
}
