import type { RoomPresence } from '@ab/shared';
import { BottomSheet } from '@expo/ui';
import { ScrollView, View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { type, useTheme } from '../../theme';
import { AppText, Button, InlineConfirm, Notice } from '../../ui';
import { PersonRow } from './PersonRow';
import type { useHostPanel } from './use-host-panel';

const H = t.mobileRoom.host;
const K = t.classroom.kick;

interface ParticipantsPanelProps {
  panel: ReturnType<typeof useHostPanel>;
  onClose: () => void;
  /** Who the lesson says is inside: a family-link guest's role in words. */
  presence: readonly RoomPresence[];
  /** Here while in the room because the header has no space for it. */
  onBrowser: (() => void) | null;
  /** The sheet is up (kept mounted, so it slides in and out). */
  open: boolean;
}

function KickConfirm({ panel }: Pick<ParticipantsPanelProps, 'panel'>) {
  const who = panel.kick;
  if (!who) return null;
  return (
    <InlineConfirm
      message={`${K.title.replace('{name}', who.name)} ${K.body}`}
      confirmLabel={panel.busy ? K.busy : K.confirm}
      tone="danger"
      busy={panel.busy}
      onConfirm={panel.confirmKick}
      onCancel={panel.cancelKick}
    />
  );
}

/** Asked first with the kit's InlineConfirm. */
function EndForAll({ panel }: Pick<ParticipantsPanelProps, 'panel'>) {
  if (!panel.canEnd) return null;
  if (!panel.ending) return <Button variant="danger" label={H.endAll} onPress={panel.askEnd} />;
  return (
    <InlineConfirm
      message={H.endConfirm}
      confirmLabel={panel.busy ? H.ending : H.endAction}
      cancelLabel={H.keep}
      tone="danger"
      busy={panel.busy}
      onConfirm={panel.confirmEnd}
      onCancel={panel.cancelEnd}
    />
  );
}

/** Host controls only; read-only for everyone else. */
export function ParticipantsPanel(props: ParticipantsPanelProps) {
  const { panel, onClose, presence, onBrowser } = props;
  const { color } = useTheme();
  const title = `${t.classroom.people} · ${panel.people.length}`;
  return (
    <BottomSheet
      isPresented={props.open}
      onDismiss={onClose}
      containerColor={color.page}
      scrimColor={color.scrim}
      contentPadding={{ top: 8, bottom: 32, left: 16, right: 16 }}
      testID="room-people"
    >
      <View style={{ gap: 12 }}>
        <AppText
          accessibilityRole="header"
          style={{ fontFamily: type.ui[700], fontSize: 18, color: color.ink }}
        >
          {title}
        </AppText>
        {panel.notice ? <Notice message={panel.notice} /> : null}
        {panel.canMuteAll ? (
          <Button variant="secondary" label={t.classroom.mute.all} onPress={panel.muteAll} />
        ) : null}
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 12 }}>
          {panel.people.map((p) => (
            <PersonRow key={p.key} person={p} panel={panel} presence={presence} />
          ))}
        </ScrollView>
        <View style={{ gap: 8 }}>
          <KickConfirm panel={panel} />
          <EndForAll panel={panel} />
          {onBrowser ? (
            <Button variant="ghost" label={t.mobileRoom.openInBrowser} onPress={onBrowser} />
          ) : null}
        </View>
      </View>
    </BottomSheet>
  );
}
