// Shared pixel helpers. Images: { width, height, data: Float32Array RGBA 0..1 }.

export const blank = (width, height) => ({
  width,
  height,
  data: new Float32Array(width * height * 4),
});

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
