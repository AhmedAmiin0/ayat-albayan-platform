import { studentStatusStyle, type SalesStudentView } from '@ab/shared';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTreeBase } from '@/core/nav/tree-base';
import { Note } from '@/more/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ListRow } from '@/core/ui/layout/ListRow';
import { PhoneText } from '@/core/ui/layout/PhoneText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { familyChatHref } from '../lib/sales-href';
import { guardianLine, studentSubtitle } from '../lib/sales-text';

const S = t.sales.allStudents;

/**
 * One student of the academy: name with its readable code, teacher · program, the guardian's phone
 * and name, the status chip. Never a balance, package, note or meeting link. Every row is a button
 * (owner 2026-10-27): in the sales tree one of hers (`mine`) opens «تفاصيل الطالب» (docs/16 row 36);
 * any other opens the family's chat in the tree the list runs in (sales see every chat with its
 * phone; the admin tree has no «تفاصيل الطالب»); one with no phone says so under the row.
 */
export const AllStudentRow = memo(function AllStudentRow({ student }: { student: SalesStudentView }) {
  const { color } = useTheme();
  const base = useTreeBase();
  const [tapped, setTapped] = useState(false);
  const phone = student.guardian_phone;
  const details = student.mine === true && base === '/sales';
  const open = () => {
    if (details) router.push(`/sales/students/${student.id}`);
    else if (phone) router.push(familyChatHref(base, phone));
    else {
      setTapped(true);
      AccessibilityInfo.announceForAccessibility(S.noPhone);
    }
  };
  return (
    <ListRow
      onPress={open}
      accessibilityHint={details ? S.detailsHint : phone ? S.chatHint : S.noPhoneHint}
      title={student.name}
      meta={student.code}
      metaStrong
      subtitle={studentSubtitle(student)}
      tags={
        <>
          {phone ? <PhoneText phone={phone} /> : null}
          <Note>{guardianLine(student)}</Note>
          {/* Only while the row still has no phone (a refetch may bring one); the action colour, not a plain note. */}
          {tapped && !details && !phone ? (
            <View style={{ flexBasis: '100%' }}>
              <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.act }}>
                {S.noPhone}
              </AppText>
            </View>
          ) : null}
        </>
      }
      trailing={<StatusChip {...studentStatusStyle[student.status]} label={t.enums.studentStatus[student.status]} size="sm" />}
    />
  );
});
