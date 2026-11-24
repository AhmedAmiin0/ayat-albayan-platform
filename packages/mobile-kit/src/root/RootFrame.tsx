import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { TopConnectingBar } from '../ui/connecting/TopConnectingBar';
import { MaintenanceScreen } from '../ui/startup';
import { StartupOverlay } from '../ui/startup/StartupOverlay';
import { useTheme } from '../theme';
import { retryStartup } from './RootProviders';
import { useMaintenance } from './use-maintenance';

interface RootFrameProps {
  /** Settled and /auth/me loaded: the stack mounts. */
  ready: boolean;
  fontsLoaded: boolean;
  children: ReactNode;
}

/** Under the maintenance cover nothing reaches a screen reader (as under the biometric lock). */
const hiddenWhile = (covered: boolean) =>
  ({
    accessibilityElementsHidden: covered,
    importantForAccessibility: covered ? 'no-hide-descendants' : 'auto',
  }) as const;

/** The maintenance cover lies over everything while the tree stays mounted beneath. */
export function RootFrame({ ready, fontsLoaded, children }: RootFrameProps) {
  const { color } = useTheme();
  const { view, checking, retry } = useMaintenance();
  return (
    <>
      {ready ? (
        <View style={{ flex: 1, backgroundColor: color.margin }} {...hiddenWhile(view !== 'open')}>
          <StatusBar style="auto" />
          <TopConnectingBar />
          {children}
        </View>
      ) : null}
      <StartupOverlay ready={ready} onRetry={retryStartup} fontsLoaded={fontsLoaded} />
      {view === 'open' ? null : (
        <View style={StyleSheet.absoluteFill}>
          <MaintenanceScreen
            kind={view}
            checking={checking}
            onRetry={retry}
            fontsLoaded={fontsLoaded}
          />
        </View>
      )}
    </>
  );
}
