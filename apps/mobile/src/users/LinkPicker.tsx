import type { LinkCandidate, LinkKind } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { SearchField } from '@/core/ui/form/SearchField';
import { candidatesQuery } from './api';
import { recordText } from './format';

export interface LinkPickerProps {
  kind: LinkKind;
  value: LinkCandidate | null;
  onChange: (value: LinkCandidate | null) => void;
  error?: string | undefined;
  /** The record is fixed (the student's own file): no «تغيير». */
  locked?: boolean;
}

/** Picks the existing teacher / student / guardian (no login yet) by name or AB-nnnn code. */
export function LinkPicker({ kind, value, onChange, error, locked = false }: LinkPickerProps) {
  const L = t.users.link;
  const { color } = useTheme();
  const [q, setQ] = useState('');
  const found = useQuery({ ...candidatesQuery(kind, q), enabled: !value });
  const box = { minHeight: 44, borderWidth: 1, borderColor: color.rule, borderRadius: shape.radius.md, paddingHorizontal: 12 };
  const text = { fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink };
  if (value) {
    return (
      <View style={{ gap: 6 }}>
        <FormLabel>{L.chosen}</FormLabel>
        <View style={[box, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }]}>
          <AppText style={[text, { flexShrink: 1 }]}>{recordText(value)}</AppText>
          {!locked ? <Button variant="ghost" label={L.change} onPress={() => onChange(null)} /> : null}
        </View>
      </View>
    );
  }
  const items = found.data ?? [];
  return (
    <View style={{ gap: 8 }}>
      <FormLabel required>{L.label}</FormLabel>
      <SearchField label={L.placeholder} onSearch={setQ} delayMs={250} />
      <Note>{L.hint}</Note>
      {error ? <ErrorLine message={error} /> : null}
      {found.isPending ? <Note>{L.searching}</Note> : null}
      {found.data && items.length === 0 ? <Note>{L.empty}</Note> : null}
      {items.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          onPress={() => onChange(c)}
          style={({ pressed }) => [box, { justifyContent: 'center', backgroundColor: pressed ? color.sunk : color.raised }]}
        >
          <AppText style={text}>{recordText(c)}</AppText>
        </Pressable>
      ))}
    </View>
  );
}
