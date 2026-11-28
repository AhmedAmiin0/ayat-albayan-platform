const DIRS = ['rtl', 'ltr'] as const;
const THEMES = ['light', 'dark'] as const;

/** Every direction and theme pair a kit showcase draws (rule 17), keyed `rtl-light` and so on. */
export const SHOWCASE_FRAMES = DIRS.flatMap((dir) =>
  THEMES.map((theme) => ({ key: `${dir}-${theme}`, dir, theme })),
);
