import { Fragment } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { raisedCard } from '@/core/ui/surface/surface';
import { TODAY_FILTERS, type TodayFilter } from '../lib/timeline';

interface SummaryCardProps {
  counts: Record<TodayFilter, number>;
  filter: TodayFilter;
  onFilter: (filter: TodayFilter) => void;
}

/**
 * Three equal columns (docs/29 §2): the day's lessons, the ones that need confirmation (in `act`, with
 * its dot) and the ended ones. Each column filters the list; the active one takes the lapis wash, a
 * second tap on it shows everything again. Every label stays on ONE line in both languages (owner
 * 2026-10-28: «need confirmation» broke in two): short words, shrunk to fit at a large font scale, and
 * the number and label centred alike in each column.
 */
export function SummaryCard({ counts, filter, onFilter }: SummaryCardProps) {
  const { color } = useTheme();
  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel={t.today.summaryLabel}
      style={{ ...raisedCard(color), flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 }}
    >
      {TODAY_FILTERS.map((value, i) => {
        const active = filter === value;
        const act = value === 'scheduled';
        const label = t.today.summary[value];
        return (
          <Fragment key={value}>
            {i > 0 ? <View style={{ width: 1, alignSelf: 'stretch', marginVertical: 6, backgroundColor: color.rule }} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={(active && value !== 'all' ? t.today.summaryFilterActive : t.today.summaryFilter).replace('{n}', String(counts[value])).replace('{label}', label)}
              onPress={() => onFilter(active ? 'all' : value)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 56,
                marginHorizontal: 4,
                paddingHorizontal: 4,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? color.lapisWash : pressed ? color.sunk : 'transparent',
              })}
            >
              {/* The dot hangs before the number, so every column's number sits centred like its label. */}
              <View>
                {act ? <View style={{ position: 'absolute', end: '100%', top: 10.5, marginEnd: 6, width: 7, height: 7, borderRadius: 3.5, backgroundColor: color.act }} /> : null}
                <AppText
                  style={{
                    fontFamily: type.ui[700],
                    fontSize: 22,
                    lineHeight: 28,
                    color: act ? color.act : color.ink,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {String(counts[value])}
                </AppText>
              </View>
              <AppText
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                maxFontSizeMultiplier={1.6}
                style={{ alignSelf: 'stretch', textAlign: 'center', fontFamily: type.ui[500], fontSize: type.size['2xs'], lineHeight: 18, color: color.ink3 }}
              >
                {label}
              </AppText>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}
