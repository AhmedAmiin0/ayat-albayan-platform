import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { usePausePreview } from './course-pause-api';
import { previewLine } from './course-pause-text';

/** «ستُلغى N حلقات، وتُمدَّد الباقة بعدد أيام الإيقاف» for the window picked now (GET …/preview); nothing if it fails. */
export function PausePreviewLine(props: { studentId: string; from: string; until: string | null }) {
  const { color } = useTheme();
  const preview = usePausePreview(props);
  const text = preview.data ? previewLine(preview.data.lessons) : preview.isPending ? t.coursePause.previewLoading : null;
  if (text === null) return null;
  return (
    <AppText
      accessibilityLiveRegion="polite"
      style={{ fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink }}
    >
      {text}
    </AppText>
  );
}
