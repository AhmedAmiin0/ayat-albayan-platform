// The svg carries its own colours (dark on white), so the PNG reads the same in dark mode.

/** The saved image's side in pixels (sharp enough to print). */
export const QR_PNG_SIDE = 1024;

function save(href: string, name: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = `${name}.png`;
  a.click();
}

/** Saves `svg` as `<name>.png`; a browser without a 2D canvas saves nothing. */
export async function downloadQrPng(svg: SVGSVGElement, name: string): Promise<void> {
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = QR_PNG_SIDE;
  canvas.height = QR_PNG_SIDE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, QR_PNG_SIDE, QR_PNG_SIDE);
  save(canvas.toDataURL('image/png'), name);
}
