import { ayahCount, juzOf, searchSurahs, surahName } from '@ab/shared';
import { fillSlots } from '@ab/client-core';
import { FlatList, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Note } from '@/more';

const ROW = 52;

interface SurahListProps {
  query: string;
  selected: number | null;
  onPick: (surah: number) => void;
}

function SurahRow({ n, on, onPick }: { n: number; on: boolean; onPick: (surah: number) => void }) {
  const { color } = useTheme();
  const name = fillSlots(t.reports.v2.picker.surahItem, { name: surahName(n, locale) });
  const meta = fillSlots(t.reports.v2.picker.surahMeta, {
    n: ayahCount(n),
    juz: juzOf({ surah: n, ayah: 1 }),
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${n} · ${name} · ${meta}`}
      accessibilityState={{ selected: on }}
      onPress={() => onPick(n)}
      style={{
        height: ROW,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: color.rule,
        backgroundColor: on ? color.lapisWash : color.page,
      }}
    >
      <AppText
        style={{
          width: 32,
          fontSize: type.size.xs,
          color: color.ink3,
          fontVariant: ['tabular-nums'],
        }}
      >
        {String(n)}
      </AppText>
      <AppText
        style={{ flex: 1, fontFamily: type.ui[600], fontSize: type.size.base, color: color.ink }}
      >
        {name}
      </AppText>
      <AppText style={{ fontSize: type.size['2xs'], color: color.ink3 }}>{meta}</AppText>
    </Pressable>
  );
}

/** The 114 surahs (or those matching the search): number, name, ayah count and juz; the picked one in mint. */
export function SurahList({ query, selected, onPick }: SurahListProps) {
  const { color } = useTheme();
  const found = searchSurahs(query);
  const at = selected === null ? -1 : found.indexOf(selected);
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: color.rule,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <FlatList
        data={found}
        keyExtractor={(n) => String(n)}
        renderItem={({ item }) => <SurahRow n={item} on={item === selected} onPick={onPick} />}
        getItemLayout={(_d, index) => ({ length: ROW, offset: ROW * index, index })}
        initialScrollIndex={at > 0 ? at : undefined}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={{ padding: 14 }}>
            <Note>{t.reports.v2.picker.noMatch}</Note>
          </View>
        }
      />
    </View>
  );
}
