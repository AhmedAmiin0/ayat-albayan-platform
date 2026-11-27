import { View } from 'react-native';
import { type, useTheme } from '../../../../theme';
import { AppText } from '../../../primitives/AppText';
import { Ltr } from '../../../primitives/Ltr';
import type { TitleLineProps } from './TitleLine.types';

/** The name (one line, «…» when long) and the LTR meta beside it. */
export function TitleLine({ title, meta, metaStrong, header, size, lineHeight }: TitleLineProps) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontFamily: type.ui[header ? 700 : 600],
          fontSize: size,
          lineHeight,
          color: color.ink,
        }}
      >
        {title}
      </AppText>
      {meta ? (
        <Ltr
          style={{
            fontFamily: type.ui[metaStrong ? 500 : 400],
            fontSize: type.size[metaStrong ? 'xs' : '2xs'],
            color: metaStrong ? color.ink2 : color.ink3,
            // The quiet meta (a phone beside a name) steps back so the name leads.
            opacity: metaStrong ? 1 : 0.85,
          }}
        >
          {meta}
        </Ltr>
      ) : null}
    </View>
  );
}
