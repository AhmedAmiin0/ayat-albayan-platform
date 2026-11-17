import { View } from 'react-native';
import { t, type, useTheme, AppText } from '@ab/mobile-kit';
import { useViewerTz } from '@/core/lib/clock';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { pauseLines } from '@/students/course-card/card-text';
import { usePausePreview } from './course-pause-api';
import { previewLine } from './course-pause-text';

type Preview = ReturnType<typeof usePausePreview>;

/** The answer's lines (an old one without dates: its count line), «جارٍ الحساب…», or nothing. */
function linesOf(preview: Preview, tz: string): string[] {
  const data = preview.data;
  if (data?.starts) return pauseLines(data, tz);
  if (data) return [previewLine(data.lessons)];
  return preview.isPending ? [t.coursePause.previewLoading] : [];
}

/**
 * «ما سيحدث» for the window picked now (GET …/preview, owner 2026-11-17): the lessons cancelled
 * with their dates, then how far the package moves on resume; an old answer without the dates
 * keeps the one count line. Nothing if it fails.
 */
export function PausePreviewLine(props: { studentId: string; from: string; until: string | null }) {
  const { color } = useTheme();
  const tz = useViewerTz();
  const shown = linesOf(usePausePreview(props), tz);
  if (shown.length === 0) return null;
  const size = type.size.sm;
  const style = { fontFamily: type.ui[600], fontSize: size, lineHeight: type.lineHeight(size), color: color.ink };
  return (
    <View style={{ gap: 4 }} accessibilityLiveRegion="polite">
      <SectionLabel>{t.courseCard.whatHappens}</SectionLabel>
      {shown.map((line) => (
        <AppText key={line} style={style}>
          {line}
        </AppText>
      ))}
    </View>
  );
}
