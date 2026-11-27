import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme';
import type { ScreenProps } from './Screen.types';
import { useScreen } from './use-screen';

/** Put a FlatList last with flex 1; `scroll` for plain-row screens so the last row shows. */
export function Screen({
  children,
  scroll = false,
  chat = false,
  list = false,
  sheet = false,
}: ScreenProps) {
  const { color } = useTheme();
  const { edges, scroll: scrollBody, body } = useScreen({ chat, list, sheet });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.margin }} edges={edges}>
      {scroll ? (
        <ScrollView testID="screen-scroll" style={{ flex: 1 }} contentContainerStyle={scrollBody}>
          {children}
        </ScrollView>
      ) : (
        <View testID="screen-body" style={body}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
