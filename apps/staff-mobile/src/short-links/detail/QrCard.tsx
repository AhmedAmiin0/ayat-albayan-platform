import { bareUrl, qrMatrix, qrPath, qrSide } from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { useState } from 'react';
import { Share, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import {
  t,
  ltr,
  raisedCard,
  type,
  useTheme,
  AppText,
  Button,
  ButtonRow,
  Note,
} from '@ab/mobile-kit';
import { copyOrShare } from '@/core/lib/clipboard';
import { copyIcon } from '@/core/ui/actions';

/** A code reads only dark on light: fixed ink and paper in either theme. */
const QR_INK = '#000000';
const QR_PAPER = '#ffffff';
const QR_SIZE = 168;

/** One <Path> of every dark module (client-core qrPath), in a viewBox of the code's side. */
function QrCode({ url }: { url: string }) {
  const matrix = qrMatrix(url);
  const side = qrSide(matrix);
  return (
    <Svg
      testID="link-qr"
      accessibilityLabel={t.shortLinks.detail.qr}
      width={QR_SIZE}
      height={QR_SIZE}
      viewBox={`0 0 ${side} ${side}`}
    >
      <Rect width={side} height={side} fill={QR_PAPER} />
      <Path testID="link-qr-path" d={qrPath(matrix)} fill={QR_INK} />
    </Svg>
  );
}

const D = () => t.shortLinks.detail;

export function QrCard({ link }: { link: Pick<ShortLinkDetail, 'shortUrl' | 'targetUrl'> }) {
  const { color } = useTheme();
  const [copied, setCopied] = useState(false);
  const copy = () => void copyOrShare(link.shortUrl).then((r) => setCopied(r === 'copied'));
  const share = () => void Share.share({ message: link.shortUrl }).catch(() => undefined);
  const opens = t.shortLinks.list.opens.replace('{host}', ltr(bareUrl(link.targetUrl)));
  return (
    <View style={{ ...raisedCard(color, 20), alignItems: 'center', gap: 10, padding: 16 }}>
      <QrCode url={link.shortUrl} />
      <AppText
        selectable
        style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}
      >
        {ltr(bareUrl(link.shortUrl))}
      </AppText>
      <Note>{opens}</Note>
      <ButtonRow>
        <Button label={D().share} onPress={share} />
        <Button variant="secondary" label={D().copy} icon={copyIcon} onPress={copy} />
      </ButtonRow>
      {copied ? <Note alert>{D().copied}</Note> : null}
    </View>
  );
}
