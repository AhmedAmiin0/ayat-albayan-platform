import type { RoomPresence } from '@ab/schedule';
import { View } from 'react-native';
import { RemoveIcon } from '../live/room-icons';
import type { RoomTile } from '../model/room-types';
import { t } from '../../lib/i18n/i18n';
import { AppText, Avatar, IconButton } from '../../ui';
import { type, useTheme } from '../../theme';
import { CameraOffIcon, MicOffIcon } from '../../ui';
import { roleWord } from './role-word';
import type { useHostPanel } from './use-host-panel';

const M = t.classroom.mute;
type Panel = ReturnType<typeof useHostPanel>;

interface PersonRowProps {
  person: RoomTile;
  panel: Pick<Panel, 'canMute' | 'canKick' | 'mute' | 'askKick'>;
  presence: readonly RoomPresence[];
}

/** Named as on the web. */
function HostActions({ person, panel }: Omit<PersonRowProps, 'presence'>) {
  const { color } = useTheme();
  const of = (line: string) => line.replace('{name}', person.name);
  return (
    <>
      {panel.canMute(person, 'microphone') ? (
        <IconButton label={of(M.micOf)} onPress={() => panel.mute(person, 'microphone')}>
          <MicOffIcon color={color.ink} />
        </IconButton>
      ) : null}
      {panel.canMute(person, 'camera') ? (
        <IconButton label={of(M.camOf)} onPress={() => panel.mute(person, 'camera')}>
          <CameraOffIcon color={color.ink} />
        </IconButton>
      ) : null}
      {panel.canKick(person) ? (
        <IconButton label={of(t.classroom.kick.actionOf)} onPress={() => panel.askKick(person)}>
          <RemoveIcon color={color.bad} />
        </IconButton>
      ) : null}
    </>
  );
}

function StateIcons({ person }: Pick<PersonRowProps, 'person'>) {
  const { color } = useTheme();
  return (
    <>
      {person.speaking ? (
        <AppText style={{ fontSize: type.size.xs, color: color.ok }}>
          {t.classroom.speaking}
        </AppText>
      ) : null}
      {person.micOn ? null : <MicOffIcon color={color.ink3} size={18} />}
      {person.camOn ? null : <CameraOffIcon color={color.ink3} size={18} />}
    </>
  );
}

export function PersonRow({ person, panel, presence }: PersonRowProps) {
  const { color } = useTheme();
  const name = person.local ? `${person.name} (${t.classroom.you})` : person.name;
  const role = roleWord(person, presence);
  return (
    <View
      testID={`room-person-${person.identity}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}
    >
      <Avatar name={person.name} size="sm" decorative />
      <View style={{ flex: 1 }}>
        <AppText numberOfLines={1} style={{ fontSize: type.size.sm, color: color.ink }}>
          {name}
        </AppText>
        {role ? (
          <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>{role}</AppText>
        ) : null}
      </View>
      <StateIcons person={person} />
      <HostActions person={person} panel={panel} />
    </View>
  );
}
