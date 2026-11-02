import { roleActions } from '@ab/client-core';
import { Switch, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { Note } from '@/more';
import type { PeopleSheetProps } from '@/students/people-edit/PeopleEditSection';
import { useConvert } from './use-convert';

const E = t.peopleEdit;

/**
 * «تحويل إلى طالب / ولي أمر» (people.switch_role): «الطالب هو ولي الأمر», the guardian who is the
 * learner as a student of their family, and a student row that is really the parent as the family's
 * guardian (only without any history or login). Each conversion behind an inline confirm.
 */
export function ConvertSheet({ view, onDone }: PeopleSheetProps) {
  const can = roleActions(view);
  const c = useConvert(view, onDone);
  const locked = !can.selfOn && !can.canSetSelf;
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Switch
          accessibilityLabel={E.selfToggle}
          value={can.selfOn}
          disabled={c.self.isPending || locked}
          onValueChange={(value) => c.self.mutate({ studentId: view.student.id, value })}
        />
        <AppText style={{ flex: 1 }}>{E.selfToggle}</AppText>
      </View>
      <Note>{locked ? E.selfTaken : E.selfHint}</Note>
      <Note>{E.toStudentHint}</Note>
      <Button
        variant="secondary"
        label={E.toStudent}
        disabled={!can.canGuardianToStudent}
        onPress={() => c.ask('toStudent')}
      />
      <Note>{can.canStudentToGuardian ? E.toGuardianHint : E.toGuardianLogin}</Note>
      <Button
        variant="secondary"
        label={E.toGuardian}
        disabled={!can.canStudentToGuardian}
        onPress={() => c.ask('toGuardian')}
      />
      {c.confirm ? (
        <InlineConfirm
          message={c.confirm.text}
          confirmLabel={E.confirm}
          busy={c.busy}
          tone="danger"
          onConfirm={c.confirm.run}
          onCancel={() => c.ask(null)}
        />
      ) : null}
      {c.error ? <Note alert>{c.error}</Note> : null}
    </View>
  );
}
