import { View } from 'react-native';
import { AppText, Ltr, type, useTheme } from '@ab/mobile-kit';

export function RowWords({ name, code, next }: { name: string; code: string; next?: string }) {
  const { color } = useTheme();
  const small = { fontSize: type.size.xs, color: color.ink2 };
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {name}
      </AppText>
      <Ltr style={{ ...small, alignSelf: 'flex-start' }}>{code}</Ltr>
      {next ? <AppText style={small}>{next}</AppText> : null}
    </View>
  );
}
