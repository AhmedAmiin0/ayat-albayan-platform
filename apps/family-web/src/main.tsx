import { startApp } from '@ab/web-kit';

// The chosen language's texts and the translation overrides first, then the family app (boot.tsx).
startApp(() => import('./boot'));
