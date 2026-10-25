import type { AssistantStatementLineView } from '@ab/shared';
import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { AmountText } from './AmountText';
import { lineText } from '../lib/money-text';

/** What a statement is made of: the salary, each commission (student and code), each adjustment (reason). */
export function StatementLines({ lines }: { lines: readonly AssistantStatementLineView[] }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {lines.map((l, i) => (
        <View
          key={`${l.kind}-${i}`}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, borderBottomWidth: 1, borderBottomColor: color.rule, paddingBottom: 6 }}
        >
          <View style={{ flexShrink: 1, gap: 2 }}>
            <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink }}>{lineText(l)}</AppText>
            {l.student ? <Ltr style={{ fontSize: type.size.xs, color: color.ink3, alignSelf: 'flex-start' }}>{l.student.code}</Ltr> : null}
          </View>
          <AmountText amount={l.amount} currency={l.currency} />
        </View>
      ))}
    </View>
  );
}
