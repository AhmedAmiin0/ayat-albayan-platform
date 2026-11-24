// Area-average resampling and placement for the brand exports. Images: { width, height,
// data: Float32Array RGBA 0..1 }, straight alpha in and out (premultiplied inside resize()).

import { blank } from './pixels.mjs';

/** Output sample `t` of line `o`: the area-weighted sum of the source samples it covers. */
function sample(ax, o, t) {
  const { src, out, n, m, s, at } = ax;
  const a = t * s,
    b = a + s;
  for (let u = Math.floor(a); u < Math.min(n, Math.ceil(b - 1e-9)); u++) {
    const w = (Math.min(b, u + 1) - Math.max(a, u)) / s;
    for (let k = 0; k < 4; k++) out[at(o, t, m) + k] += src[at(o, u, n) + k] * w;
  }
}

/** One axis of an area-average (box) resample on premultiplied RGBA. */
function axis(src, { n, m, other, at }) {
  const out = new Float32Array((src.length / n) * m);
  const ax = { src, out, n, m, s: n / m, at };
  for (let o = 0; o < other; o++) for (let t = 0; t < m; t++) sample(ax, o, t);
  return out;
}

function resize({ width: W, height: H, data }, w, h) {
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

/** Straight-alpha «over»: the source pixel at `s` drawn onto the destination pixel at `d`. */
function over(dst, src, { s, d }) {
  const a = src[s + 3];
  const da = dst[d + 3];
  const oa = a + da * (1 - a);
  for (let k = 0; k < 3; k++) {
    dst[d + k] = oa > 0 ? (src[s + k] * a + dst[d + k] * da * (1 - a)) / oa : 0;
  }
  dst[d + 3] = oa;
}

/** `fit` drawn over `out` with its top-left corner at (ox, oy). */
function composite(out, fit, { ox, oy }) {
  for (let y = 0; y < fit.height; y++) {
    for (let x = 0; x < fit.width; x++) {
      over(out.data, fit.data, {
        s: (y * fit.width + x) * 4,
        d: ((y + oy) * out.width + x + ox) * 4,
      });
    }
  }
}

/** Every pixel of `out` set to the opaque colour `bg`. */
function paint(out, bg) {
  for (let i = 0; i < out.width * out.height; i++) out.data.set([...bg, 1], i * 4);
}

/**
 * A `size`-px square (or `w`×`h`) canvas, optionally filled with `bg` ([r,g,b] 0..1), with `img`
 * scaled to fit `fill` (0..1) of it, centred.
 */
export function place(img, { w, h = w, fill = 1, bg = null }) {
  const scale = Math.min((w * fill) / img.width, (h * fill) / img.height);
  const fw = Math.max(1, Math.round(img.width * scale));
  const fh = Math.max(1, Math.round(img.height * scale));
  const out = blank(w, h);
  if (bg) paint(out, bg);
  composite(out, resize(img, fw, fh), {
    ox: Math.round((w - fw) / 2),
    oy: Math.round((h - fh) / 2),
  });
  return out;
}
