// Pixel ops for the brand exports (docs/07 §11). Images: { width, height, data: Float32Array RGBA 0..1 }.
// Colours stay straight (not premultiplied) except inside resize().

const blank = (width, height) => ({ width, height, data: new Float32Array(width * height * 4) });

/** Mean colour of the outermost pixel ring: the ivory paper the logo was drawn on. */
export function borderColour({ width: W, height: H, data }) {
  const sum = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = (i / W) | 0;
    if (x && y && x < W - 1 && y < H - 1) continue;
    for (let k = 0; k < 3; k++) sum[k] += data[i * 4 + k];
    n++;
  }
  return sum.map((s) => s / n);
}

/**
 * Colour-to-alpha against paper `bg`, rescaled so a solid stroke (≥ `solid`) is fully opaque. Only
 * the darkening direction counts: every stroke (gold, green) is darker than the ivory, and the
 * GIMP lightening term divides by (1 − bg) ≈ 0.01, which turns paper noise into opaque specks.
 */
export function strokeAlpha(c, bg, solid = 0.85) {
  let a = 0;
  for (let k = 0; k < 3; k++) a = Math.max(a, (bg[k] - c[k]) / bg[k]);
  return Math.min(1, Math.max(0, a) / solid);
}

/**
 * Removes the paper OUTSIDE the emblem: flood fill from the border (and `seeds`) through pixels
 * within `tol` of the paper colour. The emblem keeps its own ivory (star field, pages): it is the
 * same colour as the paper, so a global key would hollow out the Mushaf. A `fringe`-px band next to
 * the removed area is un-blended (colour-to-alpha), which keeps the anti-aliasing.
 */
export function extract(img, { tol = 8 / 255, fringe = 2, island = 64, seeds = [] } = {}) {
  const { width: W, height: H, data } = img;
  const bg = borderColour(img);
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  const near = (i) => px(i).every((v, k) => Math.abs(v - bg[k]) <= tol);
  const dist = new Int16Array(W * H).fill(-1); // -1 emblem, 0 removed paper, 1..fringe band
  const stack = [];
  const push = (i) => { if (dist[i] === -1 && near(i)) { dist[i] = 0; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  for (const [x, y] of seeds) push(y * W + x);
  const nb = (i) => [i % W ? i - 1 : -1, (i + 1) % W ? i + 1 : -1, i - W, i + W].filter((j) => j >= 0 && j < W * H);
  while (stack.length) for (const j of nb(stack.pop())) push(j);
  let ring = [];
  for (let i = 0; i < W * H; i++) if (dist[i] === 0) ring.push(i);
  for (let d = 1; d <= fringe; d++) {
    const next = [];
    for (const i of ring) for (const j of nb(i)) if (dist[j] === -1) { dist[j] = d; next.push(j); }
    ring = next;
  }
  // Islands cut off from the emblem body by the band (paper specks between close strokes): un-blend
  // them too. A real stroke stays opaque under strokeAlpha, so small gold dots survive.
  const seen = new Uint8Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (dist[s] !== -1 || seen[s]) continue;
    const part = [s];
    seen[s] = 1;
    for (let p = 0; p < part.length; p++) {
      for (const j of nb(part[p])) if (dist[j] === -1 && !seen[j]) { seen[j] = 1; part.push(j); }
    }
    if (part.length < island) for (const i of part) dist[i] = fringe;
  }
  const out = blank(W, H);
  for (let i = 0; i < W * H; i++) {
    const c = px(i);
    const a = dist[i] === -1 ? 1 : dist[i] === 0 ? 0 : strokeAlpha(c, bg);
    for (let k = 0; k < 3; k++) out.data[i * 4 + k] = a > 0 ? bg[k] + (c[k] - bg[k]) / a : 0;
    out.data[i * 4 + 3] = a;
  }
  return out;
}

export function crop({ width: W, data }, { x, y, w, h }) {
  const out = blank(w, h);
  for (let r = 0; r < h; r++) out.data.set(data.subarray(((y + r) * W + x) * 4, ((y + r) * W + x + w) * 4), r * w * 4);
  return out;
}

/** Tight box around pixels with alpha > `min`, grown by `pad` px. */
export function opaqueBox({ width: W, height: H, data }, pad = 0, min = 0.02) {
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0; i < W * H; i++) {
    if (data[i * 4 + 3] <= min) continue;
    const x = i % W, y = (i / W) | 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  return { x: x0, y: y0, w: Math.min(W, x1 + pad + 1) - x0, h: Math.min(H, y1 + pad + 1) - y0 };
}

/** Single-colour line art for Android themed icons: ink strokes opaque, the emblem's ivory clear. */
export function monochrome(img, bg) {
  const out = blank(img.width, img.height);
  for (let i = 0; i < img.width * img.height; i++) {
    const c = [0, 1, 2].map((k) => img.data[i * 4 + k]);
    out.data.set([1, 1, 1, img.data[i * 4 + 3] * strokeAlpha(c, bg)], i * 4);
  }
  return out;
}
