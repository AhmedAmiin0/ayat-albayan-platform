import { View } from 'react-native';
import { AppText, EmptyState, InsetGroup, t, type, useTheme } from '@ab/mobile-kit';
import { AlertRow } from '@/nav/AlertRow';
import { GROUP } from './alert-sections.helpers';
import type { AlertSectionsProps } from './AlertSections.types';
import { useAlertSections } from './use-alert-sections';

export function AlertSections({ page }: AlertSectionsProps) {
  const { color } = useTheme();
  const { clock, sections, open } = useAlertSections(page);
  if (sections.length === 0) return <EmptyState title={t.bell.empty} />;
  return sections.map((s) => (
    <View key={s.group} style={{ gap: 8 }}>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink2 }}
      >
        {GROUP[s.group]()}
      </AppText>
      <InsetGroup>
        {s.items.map((item) => (
          <AlertRow key={item.id} item={item} clock={clock} onPress={open} />
        ))}
      </InsetGroup>
    </View>
  ));
}
