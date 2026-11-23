import { startApp } from '@ab/web-kit/boot';

// The chosen language's texts and the translation overrides first, then the family app (boot.tsx).
startApp(() => import('./boot'));
