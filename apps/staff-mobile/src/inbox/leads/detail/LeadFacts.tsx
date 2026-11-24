import { formatPhone } from '@ab/core';
import { leadStatusStyle } from '@ab/money';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t, Ltr, StatusChip, shape, type, useTheme, AppText } from '@ab/mobile-kit';
import { leadAge } from '@/inbox/shared/format';
import type { LeadView } from '@ab/shared';

/** Label/value card of the lead row; its qualification and follow-up sit below (qualification/). */
export function LeadFacts({ lead }: { lead: LeadView }) {
  const { color } = useTheme();
  const valueStyle = {
    fontFamily: type.ui[500],
    fontSize: type.size.body,
    color: color.ink,
    fontVariant: ['tabular-nums' as const],
  };
  const facts: [string, ReactNode][] = [
    [
      t.leads.status,
      <StatusChip {...leadStatusStyle[lead.status]} label={t.enums.leadStatus[lead.status]} />,
    ],
    [t.leads.phone, <Ltr style={valueStyle}>{formatPhone(lead.phone_e164)}</Ltr>],
    [t.leads.source, <AppText style={valueStyle}>{t.enums.leadSource[lead.source]}</AppText>],
    [t.leads.age, <AppText style={valueStyle}>{leadAge(lead.created_at)}</AppText>],
  ];
  if (lead.last_inbound_at) {
    facts.push([
      t.leads.lastInboundAt,
      <AppText style={valueStyle}>{leadAge(lead.last_inbound_at)}</AppText>,
    ]);
  }
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: color.rule,
        borderRadius: shape.radius.md,
        backgroundColor: color.raised,
      }}
    >
      {facts.map(([label, value], i) => (
        <View
          key={label}
          style={{
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: color.rule,
          }}
        >
          <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 }}>
            {label}
          </AppText>
          {value}
        </View>
      ))}
    </View>
  );
}
