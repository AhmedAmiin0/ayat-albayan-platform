import { useState } from 'react';
import { type ImageLoadEvent, useWindowDimensions } from 'react-native';
import { A4, imageRatio } from '../pdf-ratio';
import { pageLabel, pageWidth, pressOf } from './pdf-page.helpers';
import type { PdfPageProps } from './PdfPage.types';

/**
 * A PDF page's state: its box's ratio (A4 until the image says its own), an image that broke, and
 * whether the image itself (not just its URL) has loaded.
 */
export function usePdfPage(p: PdfPageProps) {
  const width = pageWidth(useWindowDimensions().width);
  const label = pageLabel(p.page, p.pages);
  const [ratio, setRatio] = useState(A4);
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const uri = broken ? undefined : p.url;
  const failed = broken || p.failed;
  const retry = () => {
    setBroken(false);
    p.onRetry();
  };
  const zoom = uri ? () => p.onZoom({ uri, label }) : undefined;
  const onLoad = (e: ImageLoadEvent) => {
    setRatio(imageRatio(e.nativeEvent.source));
    setLoaded(uri ?? null);
  };
  return {
    width,
    height: width * ratio,
    label,
    uri,
    failed,
    waiting: !failed && (!uri || loaded !== uri),
    onPress: pressOf({ failed, retry, zoom }),
    onLoad,
    onError: () => setBroken(true),
  };
}
