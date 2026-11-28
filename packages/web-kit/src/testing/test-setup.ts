import { cleanup, configure } from '@testing-library/react';
import { setViewerPersonTz } from '@ab/client-core';
import { afterEach, beforeEach } from 'vitest';

// findBy*/waitFor budget: 1s (the default) is too tight when `turbo --force` runs every package's
// tests at once on one machine; a slow resolve then reads as a missing element.
configure({ asyncUtilTimeout: 4000 });

afterEach(cleanup);

// Tab memory (kept drafts) never carries from one test to the next.
afterEach(() => sessionStorage.clear());

// Times read in the viewer's zone (docs/34): pinned to Riyadh before every test so expectations
// never depend on the machine's zone. A test about another viewer sets its own (Africa/Cairo).
beforeEach(() => setViewerPersonTz('Asia/Riyadh'));

// jsdom has no screen capture; a desktop browser does. Specs about phones delete it to hide the buttons.
if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getDisplayMedia: () => Promise.reject(new Error('jsdom')) },
  });
}
