import { Host } from '@expo/ui';
import type { ExpoHostProps } from './ExpoHost.types';
import { useExpoHost } from './use-expo-host';

/** The one root of every @expo/ui surface: native views in the app's theme and direction. */
export function ExpoHost(props: ExpoHostProps) {
  const host = useExpoHost(props);
  return (
    <Host {...host} style={props.style} testID={props.testID}>
      {props.children}
    </Host>
  );
}
