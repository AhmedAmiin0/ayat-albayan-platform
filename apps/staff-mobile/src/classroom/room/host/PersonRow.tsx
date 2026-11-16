import { View } from 'react-native';
import type { RoomTile } from '@/classroom/room/model/room-types';
import { t, AppText, Avatar, Button, type, useTheme } from '@ab/mobile-kit';
import type { useHostPanel } from './use-host-panel';

const M = t.classroom.mute;
type Panel = ReturnType<typeof useHostPanel>;

interface PersonRowProps {
  person: RoomTile;
  panel: Pick<Panel, 'canMute' | 'canKick' | 'mute' | 'askKick'>;
}

/** «فاطمة (أنت) · معلم/ة», and the host's buttons where this person may be acted on. */
export function PersonRow({ person, panel }: PersonRowProps) {
  const { color } = useTheme();
  const name = person.local ? `${person.name} (${t.classroom.you})` : person.name;
  const of = (line: string) => line.replace('{name}', person.name);
  return (
    <View
      testID={`room-person-${person.identity}`}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
    >
      <Avatar name={person.name} size="sm" decorative />
      <View style={{ flex: 1, minWidth: 120 }}>
        <AppText numberOfLines={1} style={{ fontSize: type.size.sm, color: color.ink }}>
          {name}
        </AppText>
        {person.role ? (
          <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>
            {t.classroom.roles[person.role]}
          </AppText>
        ) : null}
      </View>
      {panel.canMute(person, 'microphone') ? (
        <Button
          variant="secondary"
          label={M.mic}
          accessibilityLabel={of(M.micOf)}
          onPress={() => panel.mute(person, 'microphone')}
        />
      ) : null}
      {panel.canMute(person, 'camera') ? (
        <Button
          variant="secondary"
          label={M.cam}
          accessibilityLabel={of(M.camOf)}
          onPress={() => panel.mute(person, 'camera')}
        />
      ) : null}
      {panel.canKick(person) ? (
        <Button
          variant="danger"
          label={t.classroom.kick.action}
          accessibilityLabel={of(t.classroom.kick.actionOf)}
          onPress={() => panel.askKick(person)}
        />
      ) : null}
    </View>
  );
}
