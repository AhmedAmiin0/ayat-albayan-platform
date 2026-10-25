import { leadStatusStyle, type LeadStatus } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { useOptimisticStatus } from '@/core/lib/query/use-optimistic-status';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { type, useTheme } from '@/theme';
import { allowedNextStatuses } from './allowed-next-statuses';
import { ErrorLine } from './ErrorLine';
import type { Lead } from './shared/types';
import { AppText } from '@/core/ui/primitives/AppText';

/**
 * «تغيير الحالة»: one chip button per move the API allows from the current status (R-LEAD-01).
 * The chip changes everywhere at once and rolls back on failure. A terminal lead shows nothing.
 */
export function LeadStatusChanger({ lead }: { lead: Lead }) {
  const { color } = useTheme();
  const change = useOptimisticStatus<LeadStatus>({ path: '/leads' });
  const next = allowedNextStatuses(lead.status);
  if (next.length === 0) return null;
  const refused = change.error instanceof ApiError && change.error.status === 409;
  return (
    <View style={{ gap: 4 }}>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink2 }}
      >
        {t.leads.changeStatus}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8 }}>
        {next.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityLabel={t.enums.leadStatus[s]}
            accessibilityState={{ disabled: change.isPending }}
            disabled={change.isPending}
            onPress={() => change.mutate({ id: lead.id, status: s })}
            style={({ pressed }) => ({
              minHeight: 44,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <StatusChip {...leadStatusStyle[s]} label={t.enums.leadStatus[s]} />
          </Pressable>
        ))}
      </View>
      {change.isError ? (
        <ErrorLine message={refused ? t.leads.invalidTransition : t.common.error} />
      ) : null}
    </View>
  );
}
