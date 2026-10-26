import type { MessageView } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { DownloadLink } from '../copy-download/DownloadLink';
import { threadFileQuery } from '../hooks/thread-file';
import { MediaNote, problemText } from './MediaNote';
import { mediaProblem, type PhotoBox } from './media-problem';
import { PhotoViewer } from './PhotoViewer';

export interface PhotoPreviewProps {
  message: MessageView;
  phone: string;
  box: PhotoBox;
  kind: string;
  /** The bubble's menu («رد», «إعادة توجيه»): the thumbnail takes the touch, so it opens it too. */
  onLongPress?: () => void;
}

/** «تعذّر تحميل الصورة»: a tap asks again. */
function RetryLine({ onPress }: { onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: shape.control.touch, justifyContent: 'center' }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.lapis }}>
        {t.inbox.photoFailed}
      </AppText>
    </Pressable>
  );
}

/**
 * A photo inside the bubble (owner 2026-10-26), signed as the bubble renders: this supersedes W6's
 * «signed only on the tap» for photos only. The box is fixed (the inverted list never jumps when it
 * loads); the cached answer keeps a 410 from asking again on every scroll back (threadFileQuery).
 * An image that fails to load is re-signed once (an expired URL), then says so with a retry.
 */
export function PhotoPreview({ message: m, phone, box, kind, onLongPress }: PhotoPreviewProps) {
  const { color } = useTheme();
  const query = threadFileQuery(phone, m.id);
  const file = useQuery(query);
  const client = useQueryClient();
  const resigned = useRef(false);
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const uri = file.data?.url ?? null;
  const retry = () => {
    setBroken(false);
    void file.refetch();
  };
  if (file.error) {
    const problem = mediaProblem(file.error);
    const text = problemText(problem, kind);
    return text ? <MediaNote text={text} /> : <RetryLine onPress={retry} />;
  }
  if (broken) return <RetryLine onPress={retry} />;
  const onError = () => {
    if (resigned.current) return setBroken(true);
    resigned.current = true;
    void client.invalidateQueries({ queryKey: query.queryKey, exact: true });
  };
  const label = t.inbox.viewMedia.replace('{kind}', kind);
  return (
    <View style={{ gap: 2 }}>
      <Pressable
        testID={`photo-${m.id}`}
        accessibilityRole="imagebutton"
        accessibilityLabel={label}
        accessibilityState={{ busy: loaded !== uri, disabled: !uri }}
        onPress={() => (uri ? setOpen(true) : undefined)}
        onLongPress={onLongPress}
        delayLongPress={350}
        style={{
          width: box.size,
          height: box.size,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: shape.radius.md,
          ...(box.border ? { borderWidth: StyleSheet.hairlineWidth, borderColor: color.rule, backgroundColor: color.sunk } : {}),
        }}
      >
        {loaded !== uri || !uri ? <ActivityIndicator accessibilityLabel={t.common.loading} color={color.ink3} /> : null}
        {uri ? (
          <Image
            // A re-signed URL is a new image: mount it afresh so its own load or error is heard.
            key={file.dataUpdatedAt}
            testID={`photo-image-${m.id}`}
            source={{ uri }}
            resizeMode={box.resizeMode}
            accessibilityIgnoresInvertColors
            onLoad={() => setLoaded(uri)}
            onError={onError}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </Pressable>
      <DownloadLink message={m} phone={phone} />
      {open && uri ? (
        <PhotoViewer uri={uri} label={m.body ? `${kind} · ${m.body}` : kind} message={m} phone={phone} onClose={() => setOpen(false)} />
      ) : null}
    </View>
  );
}
