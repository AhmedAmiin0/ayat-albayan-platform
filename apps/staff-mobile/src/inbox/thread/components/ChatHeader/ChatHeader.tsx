import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { t, type, useTheme, AppText, BackButton, PresenceLabel } from '@ab/mobile-kit';
import { ChatSearchBar, useChatSearch } from '@/inbox/thread/search';

interface ChatHeaderProps {
  /** The name (or the number); one line, cut with an ellipsis. */
  title: string;
  subtitle?: string;
  /** docs/33 §4; empty or unset means no line. */
  status?: string;
  onBack: () => void;
  /** The contact's initials circle, beside the chevron (decorative: the title reads the name). */
  avatar?: ReactNode;
  trailing?: ReactNode;
  /** Tapping the name or number: the student's details (owner 2026-10-29). Unset = not tappable. */
  onTitlePress?: () => void;
}

/** A logical row that RN mirrors, so back sits at the inline start in both languages. */
export function ChatHeader(props: ChatHeaderProps) {
  const { title, subtitle, status, onBack, avatar, trailing, onTitlePress } = props;
  const { color } = useTheme();
  const search = useChatSearch();
  if (search?.state.open) return <ChatSearchBar search={search} />;
  return (
    <View
      testID="chat-header"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minHeight: 52,
        // The chevron's 44pt box reaches the screen's start edge.
        marginStart: -10,
      }}
    >
      <BackButton onPress={onBack} />
      {avatar}
      {/* Hugs the chevron at the inline-start. */}
      <Pressable
        testID="chat-names"
        disabled={!onTitlePress}
        onPress={onTitlePress}
        accessibilityRole={onTitlePress ? 'button' : undefined}
        accessibilityHint={onTitlePress ? t.inbox.studentDetails : undefined}
        style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}
      >
        <AppText
          testID="chat-title"
          accessibilityRole="header"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            fontFamily: type.display,
            fontSize: type.size.h4,
            lineHeight: type.lineHeight(type.size.h4, true),
            color: color.ink,
          }}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            testID="chat-subtitle"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontFamily: type.ui[500],
              fontSize: type.size['2xs'],
              lineHeight: type.lineHeight(type.size['2xs']),
              color: color.ink2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {subtitle}
          </AppText>
        ) : null}
        <PresenceLabel testID="chat-status" text={status ?? ''} />
      </Pressable>
      {trailing}
    </View>
  );
}
