import { ActivityIndicator } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { useTheme } from '../../../../theme';

/** Under the last row while the next page is on its way. */
export function PagedFooter() {
  const { color } = useTheme();
  return (
    <ActivityIndicator
      testID="paged-footer"
      accessibilityLabel={t.common.loading}
      color={color.lapis}
      style={{ paddingVertical: 16 }}
    />
  );
}
