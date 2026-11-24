// Crop, bounds and line-art ops for the brand exports (docs/07 §11). Images: { width, height,
// data: Float32Array RGBA 0..1 }; colours stay straight (not premultiplied).
import { blank, strokeAlpha } from './pixels.mjs';

export function crop({ width: W, data }, { x, y, w, h }) {
  const out = blank(w, h);
  for (let r = 0; r < h; r++)
    out.data.set(data.subarray(((y + r) * W + x) * 4, ((y + r) * W + x + w) * 4), r * w * 4);
  return out;
}

/** Tight box around pixels with alpha > `min`, grown by `pad` px. */
export function opaqueBox({ width: W, height: H, data }, pad = 0, min = 0.02) {
  let x0 = W,
    y0 = H,
    x1 = 0,
    y1 = 0;
  for (let i = 0; i < W * H; i++) {
    if (data[i * 4 + 3] <= min) continue;
    const x = i % W,
      y = (i / W) | 0;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  return { x: x0, y: y0, w: Math.min(W, x1 + pad + 1) - x0, h: Math.min(H, y1 + pad + 1) - y0 };
}

/** Single-colour line art for Android themed icons: ink strokes opaque, the emblem ivory clear. */
export function monochrome(img, bg) {
  const out = blank(img.width, img.height);
  for (let i = 0; i < img.width * img.height; i++) {
    const c = [0, 1, 2].map((k) => img.data[i * 4 + k]);
    out.data.set([1, 1, 1, img.data[i * 4 + 3] * strokeAlpha(c, bg)], i * 4);
  }
  return out;
}
