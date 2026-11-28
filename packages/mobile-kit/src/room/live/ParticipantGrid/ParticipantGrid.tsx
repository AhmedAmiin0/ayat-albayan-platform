import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { AppText } from '../../../ui';
import { type, useTheme } from '../../../theme';
import { ParticipantTile } from '../ParticipantTile';
import type { ParticipantGridProps } from './ParticipantGrid.types';
import { useParticipantGrid } from './use-participant-grid';

/** docs/35 §3: zoom gives a shared screen the whole grid until unzoom or the share stops. */
export function ParticipantGrid({ tiles, Video, actions }: ParticipantGridProps) {
  const { color } = useTheme();
  const { big, rows, alone, tileActions } = useParticipantGrid({ tiles, actions });
  return (
    <View testID="room-grid" style={{ flex: 1, gap: 8, paddingHorizontal: 8 }}>
      {rows.map((row) => (
        <View
          key={row.map((x) => x.key).join('|')}
          style={{ flex: row[0]?.screen ? 2 : 1, flexDirection: 'row', gap: 8 }}
        >
          {row.map((tile) => (
            <ParticipantTile key={tile.key} tile={tile} Video={Video} actions={tileActions} />
          ))}
        </View>
      ))}
      {alone && !big ? (
        <AppText
          accessibilityLiveRegion="polite"
          style={{ textAlign: 'center', fontSize: type.size.sm, color: color.coverInk }}
        >
          {t.classroom.waiting}
        </AppText>
      ) : null}
    </View>
  );
}
