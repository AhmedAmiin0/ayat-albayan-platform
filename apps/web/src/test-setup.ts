import { cleanup, configure } from '@testing-library/react';
import { CLOCK_STORAGE_KEY } from '@ab/shared';
import { afterEach } from 'vitest';

// findBy*/waitFor budget: 1s (the default) is too tight when `turbo --force` runs every package's
// tests at once on one machine; a slow resolve then reads as a missing element.
configure({ asyncUtilTimeout: 4000 });

afterEach(cleanup);

// Times read 24 h unless a test picks 12 h: jsdom's en-US locale would otherwise mean 12 h («تلقائي»).
localStorage.setItem(CLOCK_STORAGE_KEY, '24');

// jsdom has no screen capture; a desktop browser does. Specs about phones delete it to hide the buttons.
if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getDisplayMedia: () => Promise.reject(new Error('jsdom')) } });
}
