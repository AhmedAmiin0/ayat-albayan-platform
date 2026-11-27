import { View } from 'react-native';
import { AppText, Avatar, Chevron, Mark, type, useTheme } from '@ab/mobile-kit';
import type { WhoProps } from './Who.types';

/** The avatar (or the mark), the small line over the big one. */
export function Who({ title, over, student, switches }: WhoProps) {
  const { color } = useTheme();
  return (
    <>
      {student ? <Avatar name={student.name} id={student.id} decorative /> : <Mark size={44} />}
      <View style={{ flexShrink: 1 }}>
        <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>{over}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText
            accessibilityRole="header"
            numberOfLines={1}
            style={{
              flexShrink: 1,
              fontFamily: type.display,
              fontSize: type.size.h4,
              color: color.ink,
            }}
          >
            {title}
          </AppText>
          {switches ? <Chevron to="down" color={color.ink2} /> : null}
        </View>
      </View>
    </>
  );
}
