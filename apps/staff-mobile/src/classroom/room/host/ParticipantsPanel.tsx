import { ScrollView, View } from 'react-native';
import { RoomSheet } from '@/classroom/room/live/RoomSheet';
import { t, Button, InlineConfirm, Notice } from '@ab/mobile-kit';
import { PersonRow } from './PersonRow';
import type { useHostPanel } from './use-host-panel';

const H = t.mobileRoom.host;
const K = t.classroom.kick;

interface ParticipantsPanelProps {
  panel: ReturnType<typeof useHostPanel>;
  onClose: () => void;
}

/** «إخراج {name} من الحلقة؟»: the web room's question and its consequence. */
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

/** «إنهاء الحلقة للجميع», asked first with the kit's InlineConfirm (canvas RoomXEndAll). */
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

/**
 * «المشاركون · 3» (canvas RoomXTeacher, RoomXParticipants): everyone with their role; the host's
 * «كتم الجميع», per person mute / camera off / «إخراج», and «إنهاء الحلقة للجميع». Read-only for
 * everyone else.
 */
export function ParticipantsPanel({ panel, onClose }: ParticipantsPanelProps) {
  const title = `${t.classroom.people} · ${panel.people.length}`;
  return (
    <RoomSheet testID="room-people" title={title} onClose={onClose}>
      {panel.notice ? <Notice message={panel.notice} /> : null}
      {panel.canMuteAll ? (
        <Button variant="secondary" label={t.classroom.mute.all} onPress={panel.muteAll} />
      ) : null}
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 12 }}>
        {panel.people.map((p) => (
          <PersonRow key={p.key} person={p} panel={panel} />
        ))}
      </ScrollView>
      <View style={{ gap: 8 }}>
        <KickConfirm panel={panel} />
        <EndForAll panel={panel} />
      </View>
    </RoomSheet>
  );
}
