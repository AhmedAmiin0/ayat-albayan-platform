import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';
import type { ReportField } from './report-fields';

/** A label over its value (aligned by its own words); a blank field says so in ink-3 instead of disappearing. */
export function ReportFieldRow({ field }: { field: ReportField }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>
        {field.label}
      </AppText>
      <ContentText
        source={field.value ?? ''}
        style={{
          fontFamily: type.ui[400],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: field.value ? color.ink : color.ink3,
        }}
      >
        {field.value ?? t.mobileAdmin.reports.noContent}
      </ContentText>
    </View>
  );
}
