import { AppText, EmptyState, t, type, useTheme } from '@ab/mobile-kit';

/** Google Meet lessons are not recorded, so the empty state says so. */
export function Empty({ name }: { name: string }) {
  const { color } = useTheme();
  const note = { fontSize: type.size.sm, color: color.ink3, textAlign: 'center' as const };
  return (
    <>
      <EmptyState title={t.lessonFiles.empty} />
      <AppText style={note}>{t.lessonFiles.emptyMeet.replace('{name}', name)}</AppText>
      <AppText style={note}>{t.lessonFiles.emptyRoom}</AppText>
    </>
  );
}
