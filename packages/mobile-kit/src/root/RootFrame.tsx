import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { TopConnectingBar } from '../ui/connecting/TopConnectingBar';
import { StartupOverlay } from '../ui/startup/StartupOverlay';
import { useTheme } from '../theme';
import { retryStartup } from './RootProviders';

interface RootFrameProps {
  /** Settled and /auth/me loaded: the stack mounts. */
  ready: boolean;
  fontsLoaded: boolean;
  children: ReactNode;
}

/** The app's frame once ready (status bar, reconnecting bar, stack); the startup overlay on top. */
export function RootFrame({ ready, fontsLoaded, children }: RootFrameProps) {
  const { color } = useTheme();
  return (
    <>
      {ready ? (
        <View style={{ flex: 1, backgroundColor: color.margin }}>
          <StatusBar style="auto" />
          <TopConnectingBar />
          {children}
        </View>
      ) : null}
      <StartupOverlay ready={ready} onRetry={retryStartup} fontsLoaded={fontsLoaded} />
    </>
  );
}
