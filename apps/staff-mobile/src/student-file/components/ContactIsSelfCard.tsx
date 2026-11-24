import { useMutation, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { apiSend, t, pathKey, AppText, type, useTheme } from '@ab/mobile-kit';
import { ContactIsSelfPills } from './ContactIsSelfPills';

interface ContactIsSelfCardProps {
  studentId: string;
  /** Absent from an older API means the guardian. */
  value: boolean | undefined;
}

export function ContactIsSelfCard({ studentId, value }: ContactIsSelfCardProps) {
  const { color } = useTheme();
  const client = useQueryClient();
  const path = `/students/${studentId}`;
  const save = useMutation({
    mutationFn: (next: boolean) => apiSend<unknown>('PATCH', path, { contact_is_self: next }),
    onSettled: () => client.invalidateQueries({ queryKey: pathKey(path) }),
  });
  const shown = save.isPending && save.variables !== undefined ? save.variables : (value ?? false);
  const small = (ink: string, weight: 400 | 600) => ({
    fontFamily: type.ui[weight],
    fontSize: type.size.xs,
    lineHeight: type.lineHeight(type.size.xs),
    color: ink,
  });
  const pick = (next: boolean) => {
    if (!save.isPending && next !== shown) save.mutate(next);
  };
  return (
    <View style={{ gap: 6 }}>
      <AppText style={small(color.ink3, 600)}>{t.familyAuth.contactIsSelf.label}</AppText>
      <ContactIsSelfPills value={shown} onChange={pick} disabled={save.isPending} />
      <AppText style={small(color.ink3, 400)}>{t.familyAuth.contactIsSelf.hint}</AppText>
      {save.isError ? (
        <AppText accessibilityRole="alert" style={small(color.bad, 400)}>{t.common.error}</AppText>
      ) : null}
    </View>
  );
}
