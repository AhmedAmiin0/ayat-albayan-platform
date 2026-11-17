import { Linking } from 'react-native';

/** A file the chat cannot show itself opens in the phone's own app (its signed link, 1 h). */
export function openOutside(url: string | null): void {
  if (!url) return;
  void Linking.openURL(url).catch(() => undefined);
}
