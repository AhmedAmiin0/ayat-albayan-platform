import { type, useTheme } from '@ab/mobile-kit';
import { useContactSelfSave } from '@/student-file/hooks/use-contact-self-save';
import type { ContactIsSelfCardProps, ContactIsSelfCardState } from './ContactIsSelfCard.types';

const small = (ink: string, weight: 400 | 600) => ({
  fontFamily: type.ui[weight],
  fontSize: type.size.xs,
  lineHeight: type.lineHeight(type.size.xs),
  color: ink,
});

export function useContactIsSelfCard({
  studentId,
  value,
}: ContactIsSelfCardProps): ContactIsSelfCardState {
  const { color } = useTheme();
  const save = useContactSelfSave(studentId);
  const shown = save.isPending ? save.variables : (value ?? false);
  const isNewPick = (next: boolean) => !save.isPending && next !== shown;
  return {
    shown,
    saving: save.isPending,
    failed: save.isError,
    pick: (next) => {
      if (isNewPick(next)) save.mutate(next);
    },
    text: {
      label: small(color.ink3, 600),
      hint: small(color.ink3, 400),
      alert: small(color.bad, 400),
    },
  };
}
