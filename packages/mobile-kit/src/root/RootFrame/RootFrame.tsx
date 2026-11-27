import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import { TopConnectingBar } from '../../ui/connecting/TopConnectingBar';
import { MaintenanceScreen } from '../../ui/startup';
import { StartupOverlay } from '../../ui/startup/StartupOverlay';
import { retryStartup } from '../retry-startup';
import type { RootFrameProps } from './RootFrame.types';
import { useRootFrame } from './use-root-frame';

/** The maintenance cover lies over everything while the tree stays mounted beneath. */
export function RootFrame({ ready, fontsLoaded, children }: RootFrameProps) {
  const { color } = useTheme();
  const { view, checking, retry, hidden } = useRootFrame();
  return (
    <>
      {ready ? (
        <View style={{ flex: 1, backgroundColor: color.margin }} {...hidden}>
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
