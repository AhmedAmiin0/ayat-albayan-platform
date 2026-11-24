import { allowedNextStatuses, type LeadStatus } from '@ab/catalog';
import { leadStatusStyle } from '@ab/money';
import { Pressable, View } from 'react-native';
import { ApiError, t, StatusChip, type, useTheme, AppText, ErrorLine } from '@ab/mobile-kit';
import { useOptimisticStatus } from '@/core/lib/query/use-optimistic-status';
import type { LeadView } from '@ab/shared';

/** Only moves the API allows (R-LEAD-01); optimistic with rollback; terminal leads show nothing. */
export function LeadStatusChanger({ lead }: { lead: LeadView }) {
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
