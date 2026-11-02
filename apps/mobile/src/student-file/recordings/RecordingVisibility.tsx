import type { StudentRecordingView } from '@ab/shared';
import { Switch, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { useSetVisibility, visibilityError } from './recording-actions';

const V = t.mobileStudentFile.recordings.visible;

/**
 * «إظهار للطالب» (off by default). The switch is live only for who may change it (`editable`: the
 * recordings.manage permission and the row's `can_manage`); everyone else just reads the state.
 */
export function RecordingVisibility({ rec, studentId, editable }: { rec: StudentRecordingView; studentId: string; editable: boolean }) {
  const { color } = useTheme();
  const toggle = useSetVisibility(studentId);
  return (
    <View style={{ gap: 4 }}>
      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <AppText style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>{V.label}</AppText>
        <Switch
          accessibilityLabel={V.label}
          value={rec.visible_to_student}
          disabled={!editable || toggle.isPending}
          onValueChange={(visible) => toggle.mutate({ id: rec.id, visible })}
        />
      </View>
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3 }}>
        {rec.visible_to_student ? V.on : V.off}
      </AppText>
      {toggle.isError ? <ErrorLine message={visibilityError(toggle.error)} /> : null}
    </View>
  );
}
