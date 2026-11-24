import type { StopDone } from '@ab/client-core';
import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Button, ButtonRow, shape, t, type, useTheme } from '@ab/mobile-kit';
import { inTree, useInChat, useTreeBase } from '@/core/nav/tree-base';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { threadHref } from '@/inbox';
import { SheetLines } from './SheetLines';

interface StopDoneViewProps {
  done: StopDone;
  /** Absent, or when already above a chat, means no open-chat button. */
  chatPhone?: string | undefined;
  onClose: () => void;
}

export function StopDoneView({ done, chatPhone, onClose }: StopDoneViewProps) {
  const { color } = useTheme();
  const base = useTreeBase();
  const phone = useInChat() ? undefined : chatPhone;
  const s = t.courseActions.stop;
  const size = type.size.sm;
  const body = { fontFamily: type.ui[500], fontSize: size, lineHeight: type.lineHeight(size) };
  const sunk = { backgroundColor: color.sunk };
  const openChat = (to: string) => () => {
    onClose();
    router.push(inTree(base, threadHref(to)));
  };
  return (
    <View style={{ gap: 14 }}>
      <AppText style={{ ...body, fontFamily: type.ui[700], color: color.ink }}>{done.head}</AppText>
      <AppText style={{ ...body, color: color.ink2 }}>{done.status}</AppText>
      <View style={{ gap: 4, padding: 12, borderRadius: shape.radius.md, ...sunk }}>
        <SectionLabel>{s.nextTitle}</SectionLabel>
        <AppText style={{ ...body, color: color.ink }}>{done.next}</AppText>
      </View>
      <View style={{ gap: 4 }}>
        <SectionLabel>{s.notifiedTitle}</SectionLabel>
        <SheetLines lines={done.notified} />
      </View>
      <ButtonRow>
        {phone ? (
          <Button variant="secondary" label={t.students.family.openChat} onPress={openChat(phone)} />
        ) : null}
        <Button label={s.close} onPress={onClose} />
      </ButtonRow>
    </View>
  );
}
