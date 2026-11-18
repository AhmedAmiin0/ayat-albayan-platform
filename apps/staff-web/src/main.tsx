import { startApp } from '@ab/web-kit/boot/start-app';

// The chosen language's texts and the translation overrides first, then the staff app (boot.tsx).
startApp(() => import('./boot'));
