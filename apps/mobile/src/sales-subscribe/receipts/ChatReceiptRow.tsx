import type { SalesChatReceipt } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { instantDay } from '@/payments/format';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ChatReceiptThumb } from './ChatReceiptThumb';

interface ChatReceiptRowProps {
  studentId: string;
  item: SalesChatReceipt;
  /** This file is being copied now. */
  busy: boolean;
  onPick: (item: SalesChatReceipt) => void;
}

/** One image / PDF of the family's chat: its thumbnail, day and caption; an expired one is off. */
export function ChatReceiptRow({ studentId, item, busy, onPick }: ChatReceiptRowProps) {
  const { color } = useTheme();
  const name = [instantDay(item.created_at), item.caption].filter(Boolean).join(' · ');
  const off = item.expired || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.expired ? `${name} · ${t.salesMoney.receiptExpired}` : name}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={() => onPick(item)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
        opacity: item.expired ? 0.5 : 1,
        backgroundColor: pressed ? color.sunk : 'transparent',
      })}
    >
      <ChatReceiptThumb studentId={studentId} item={item} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>{name}</AppText>
        {item.expired ? (
          <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3 }}>
            {t.salesMoney.receiptExpired}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
