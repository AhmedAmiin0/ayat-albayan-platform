// Area-average resampling and placement for the brand exports. Images: { width, height,
// data: Float32Array RGBA 0..1 }, straight alpha in and out (premultiplied inside resize()).

const blank = (width, height) => ({ width, height, data: new Float32Array(width * height * 4) });

/** One axis of an area-average (box) resample on premultiplied RGBA. */
function axis(src, { n, m, other, at }) {
  const out = new Float32Array(src.length / n * m);
  const s = n / m;
  for (let o = 0; o < other; o++) {
    for (let t = 0; t < m; t++) {
      const a = t * s, b = a + s;
      for (let u = Math.floor(a); u < Math.min(n, Math.ceil(b - 1e-9)); u++) {
        const w = (Math.min(b, u + 1) - Math.max(a, u)) / s;
        for (let k = 0; k < 4; k++) out[at(o, t, m) + k] += src[at(o, u, n) + k] * w;
      }
    }
  }
  return out;
}

export function resize({ width: W, height: H, data }, w, h) {
  const pre = new Float32Array(data);
  for (let i = 0; i < W * H; i++) for (let k = 0; k < 3; k++) pre[i * 4 + k] *= pre[i * 4 + 3];
  const rows = axis(pre, { n: W, m: w, other: H, at: (y, x, width) => (y * width + x) * 4 });
  const both = axis(rows, { n: H, m: h, other: w, at: (x, y) => (y * w + x) * 4 });
  for (let i = 0; i < w * h; i++) {
    const a = both[i * 4 + 3];
    for (let k = 0; k < 3; k++) both[i * 4 + k] = a > 0 ? both[i * 4 + k] / a : 0;
  }
  return { width: w, height: h, data: both };
}

/**
 * A `size`-px square (or `w`×`h`) canvas, optionally filled with `bg` ([r,g,b] 0..1), with `img`
 * scaled to fit `fill` (0..1) of it, centred.
 */
export function place(img, { w, h = w, fill = 1, bg = null }) {
  const scale = Math.min((w * fill) / img.width, (h * fill) / img.height);
  const fw = Math.max(1, Math.round(img.width * scale)), fh = Math.max(1, Math.round(img.height * scale));
  const fit = resize(img, fw, fh);
  const out = blank(w, h);
  if (bg) for (let i = 0; i < w * h; i++) out.data.set([...bg, 1], i * 4);
  const ox = Math.round((w - fw) / 2), oy = Math.round((h - fh) / 2);
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    const s = (y * fw + x) * 4, d = ((y + oy) * w + x + ox) * 4;
    const a = fit.data[s + 3], da = out.data[d + 3], oa = a + da * (1 - a);
    for (let k = 0; k < 3; k++) out.data[d + k] = oa > 0 ? (fit.data[s + k] * a + out.data[d + k] * da * (1 - a)) / oa : 0;
    out.data[d + 3] = oa;
  }
  return out;
}
