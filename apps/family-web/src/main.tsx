import { startApp } from '@ab/web-kit/boot/start-app';
// The family look (<html data-skin="family">, index.html): its faces and scoped tokens.
import '@ab/web-kit/family/theme/fonts';

// The chosen language's texts and the translation overrides first, then the family app (boot.tsx).
startApp(() => import('./boot'));
