import { surahName, type SurahRange } from '@ab/shared';
import { fillSlots, rangeSummary } from '@ab/client-core';
import { useState } from 'react';
import { Modal, TextInput, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { Pills } from '../ui/Pills';
import { AyahStepper } from './AyahStepper';
import { pickSurah, rangeOf, setBound, type PickerStart } from './picker-state';
import { SurahList } from './SurahList';

interface SurahPickerSheetProps {
  /** The track's title («الحفظ الجديد»). */
  title: string;
  start: PickerStart;
  /** entry.memory.recent_surahs: the «الأخيرة» shortcuts. */
  recent: readonly number[];
  onCancel: () => void;
  onDone: (range: SurahRange) => void;
}

/**
 * The bottom sheet that picks a part's surah and ayahs (docs/design/report-form/SurahPicker): search,
 * recent surahs, the list, from/to steppers, the range's size, page and juz, then «تمّ».
 */
export function SurahPickerSheet(p: SurahPickerSheetProps) {
  const { color } = useTheme();
  const v2 = t.reports.v2;
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(p.start.draft);
  const range = rangeOf(draft);
  const pick = (surah: number) => setDraft((d) => pickSurah(d, surah));
  const afterLast = p.start.afterAyah !== null && draft.surah === p.start.draft.surah;
  const summary = range
    ? rangeSummary(range, { ayahs: v2.ayahs, summary: v2.picker.summary })
    : null;
  const recent = p.recent.map((n) => ({ value: String(n), label: surahName(n, locale) }));
  return (
    <Modal visible transparent animationType="slide" onRequestClose={p.onCancel}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}>
        <View
          accessibilityViewIsModal
          accessibilityLabel={p.title}
          style={{
            height: '88%',
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 28,
            backgroundColor: color.page,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: shape.radius.pill,
              backgroundColor: color.ruleStrong,
            }}
          />
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <AppText
              accessibilityRole="header"
              style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink }}
            >
              {p.title}
            </AppText>
            <Button variant="ghost" label={v2.picker.cancel} onPress={p.onCancel} />
          </View>
          <TextInput
            accessibilityLabel={v2.picker.search}
            placeholder={v2.picker.searchPlaceholder}
            placeholderTextColor={color.ink3}
            value={query}
            onChangeText={setQuery}
            style={{
              minHeight: shape.control.comfort,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: color.ruleInput,
              borderRadius: 10,
              backgroundColor: color.sunk,
              color: color.ink,
              fontFamily: type.ui[400],
              fontSize: type.size.body,
            }}
          />
          {recent.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText style={{ fontSize: type.size['2xs'], color: color.ink3 }}>
                {v2.picker.recent}
              </AppText>
              <Pills
                label={v2.picker.recent}
                items={recent}
                isOn={(n) => Number(n) === draft.surah}
                onPress={(n) => pick(Number(n))}
              />
            </View>
          ) : null}
          <SurahList query={query} selected={draft.surah} onPick={pick} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AyahStepper
              label={v2.picker.from}
              value={draft.from}
              onChange={(value) => setDraft((d) => setBound(d, { end: 'from', value }))}
              disabled={!range}
            />
            <AyahStepper
              label={v2.picker.to}
              value={draft.to}
              onChange={(value) => setDraft((d) => setBound(d, { end: 'to', value }))}
              disabled={!range}
            />
          </View>
          {summary ? (
            <AppText
              style={{
                fontSize: type.size.xs,
                lineHeight: type.lineHeight(type.size.xs),
                color: color.ink2,
              }}
            >
              {afterLast
                ? `${summary} ${fillSlots(v2.picker.afterLast, { ayah: p.start.afterAyah ?? '' })}`
                : summary}
            </AppText>
          ) : null}
          <Button
            label={v2.picker.done}
            disabled={!range}
            onPress={() => range && p.onDone(range)}
          />
        </View>
      </View>
    </Modal>
  );
}
