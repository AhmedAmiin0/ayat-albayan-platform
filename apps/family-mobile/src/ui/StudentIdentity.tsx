import type { PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText, Avatar, Ltr, type, useTheme } from '@ab/mobile-kit';

interface StudentIdentityProps {
  student: PortalStudent;
  /** A line under the code (the last report). */
  children?: ReactNode;
  name?: string;
}

export function StudentIdentity({ student, children, name }: StudentIdentityProps) {
  const { color } = useTheme();
  return (
    <>
      <Avatar name={student.name} id={student.id} decorative />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText
          numberOfLines={1}
          style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}
        >
          {name ?? student.name}
        </AppText>
        <Ltr style={{ fontSize: type.size.xs, color: color.ink2 }}>{student.code}</Ltr>
        {children}
      </View>
    </>
  );
}
