import { counted } from '@ab/core';
import { Image, View } from 'react-native';
import { t, AppText, shape, type, useTheme } from '@ab/mobile-kit';
import type { SharedFile, SharedItems } from '@/inbox/thread/share/read-share';
import { sharedKind } from '@/inbox/thread/share/share-rules';

const s = t.inbox.share;

function Line({ text, lines }: { text: string; lines: number }) {
  const { color } = useTheme();
  const size = type.size.body;
  return (
    <AppText
      numberOfLines={lines}
      style={{
        flex: 1,
        fontFamily: type.ui[400],
        fontSize: size,
        lineHeight: type.lineHeight(size),
        color: color.ink,
      }}
    >
      {text}
    </AppText>
  );
}

function FilesPreview({ files, first }: { files: readonly SharedFile[]; first: SharedFile }) {
  const { color } = useTheme();
  const count = counted(s.files, files.length);
  const line = first.name ? `${count} · ${first.name}` : count;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {sharedKind(first) === 'image' ? (
        <Image
          testID="share-thumb"
          source={{ uri: first.uri }}
          accessibilityIgnoresInvertColors
          style={{
            width: 48,
            height: 48,
            borderRadius: shape.radius.sm,
            backgroundColor: color.rule,
          }}
        />
      ) : null}
      <Line text={line} lines={1} />
    </View>
  );
}

/** What was shared: the text's first two lines, or the files' count and first name. */
export function SharePreview({ items }: { items: SharedItems }) {
  const first = items.files[0];
  return (
    <View testID="share-preview" style={{ paddingVertical: 8 }}>
      {first ? (
        <FilesPreview files={items.files} first={first} />
      ) : (
        <Line text={items.text} lines={2} />
      )}
    </View>
  );
}
