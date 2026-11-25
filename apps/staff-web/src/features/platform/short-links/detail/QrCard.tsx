import { bareUrl, qrMatrix, qrPath, qrSide } from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { useRef } from 'react';
import { Icon, Ltr, Button, t } from '@ab/web-kit';
import { CopyButton } from '@/features/platform/short-links/shared/CopyButton';
import { downloadQrPng } from './qr-png';

const D = t.shortLinks.detail;

export function QrCard({ link }: { link: Pick<ShortLinkDetail, 'code' | 'shortUrl'> }) {
  const svg = useRef<SVGSVGElement>(null);
  const matrix = qrMatrix(link.shortUrl);
  const side = qrSide(matrix);
  const download = () => {
    if (svg.current) void downloadQrPng(svg.current, link.code);
  };
  return (
    <section
      aria-labelledby="link-qr"
      className="grid content-start gap-3 rounded-md border border-rule p-4"
    >
      <h2 id="link-qr" className="text-base font-bold">{D.qr}</h2>
      <div className="rounded-md border border-rule bg-white p-3">
        <svg
          ref={svg}
          role="img"
          aria-label={D.qr}
          viewBox={`0 0 ${side} ${side}`}
          shapeRendering="crispEdges"
          className="mx-auto block aspect-square w-full max-w-[200px]"
        >
          <rect width={side} height={side} fill="#ffffff" />
          <path d={qrPath(matrix)} fill="#111111" />
        </svg>
      </div>
      <Ltr className="truncate text-sm font-semibold">{bareUrl(link.shortUrl)}</Ltr>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={download}>
          <Icon name="download" />
          {D.downloadPng}
        </Button>
        <CopyButton text={link.shortUrl} label={D.copyLink} wide />
      </div>
    </section>
  );
}
