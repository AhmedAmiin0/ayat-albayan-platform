import { localizedName } from '@ab/shared';
import { View } from 'react-native';
import { locale } from '@/core/lib/i18n/locale';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { DetailsLine } from './DetailsGroup';
import type { DetailsLesson } from './details-text';

interface DetailsTeacherProps {
  teacher: DetailsLesson['teacher'];
  /** The admin's sheet: the teacher's photo (or initials) at 28pt beside the name. */
  photo: boolean;
}

/** «المعلم/ة»'s value: the name, read once (the avatar beside it is decorative). */
export function DetailsTeacher({ teacher, photo }: DetailsTeacherProps) {
  const name = localizedName({ ar: teacher.display_name_ar, en: teacher.display_name_en ?? null }, locale);
  if (!photo) return <DetailsLine tone="ink">{name}</DetailsLine>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Avatar name={name} id={teacher.id} src={teacher.avatar_url} size="sm" decorative />
      <DetailsLine tone="ink">{name}</DetailsLine>
    </View>
  );
}
