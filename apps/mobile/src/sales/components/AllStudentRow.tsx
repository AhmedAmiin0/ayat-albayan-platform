import { studentStatusStyle, type SalesStudentView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { ListRow } from '@/core/ui/layout/ListRow';
import { PhoneText } from '@/core/ui/layout/PhoneText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { familyChatHref } from '../lib/sales-href';
import { guardianLine, studentSubtitle } from '../lib/sales-text';

const S = t.sales.allStudents;

/**
 * One student of the academy: name with its readable code, teacher · program, the guardian's phone
 * and name, the status chip. Never a balance, package, note or meeting link. Every row is a button
 * (owner 2026-10-27): one of hers (`mine`) opens «تفاصيل الطالب» (docs/16 row 36); any other opens the
 * family's chat (sales see every chat with its phone); one with no phone says so under the row.
 */
export function AllStudentRow({ student }: { student: SalesStudentView }) {
  const [noPhone, setNoPhone] = useState(false);
  const phone = student.guardian_phone;
  const open = () => {
    if (student.mine) router.push(`/sales/students/${student.id}`);
    else if (phone) router.push(familyChatHref(phone));
    else {
      setNoPhone(true);
      AccessibilityInfo.announceForAccessibility(S.noPhone);
    }
  };
  return (
    <ListRow
      onPress={open}
      accessibilityHint={student.mine ? S.detailsHint : phone ? S.chatHint : S.noPhoneHint}
      title={student.name}
      meta={student.code}
      metaStrong
      subtitle={studentSubtitle(student)}
      tags={
        <>
          {phone ? <PhoneText phone={phone} /> : null}
          <Note>{guardianLine(student)}</Note>
          {noPhone ? (
            <View style={{ flexBasis: '100%' }}>
              <Note>{S.noPhone}</Note>
            </View>
          ) : null}
        </>
      }
      trailing={<StatusChip {...studentStatusStyle[student.status]} label={t.enums.studentStatus[student.status]} size="sm" />}
    />
  );
}
