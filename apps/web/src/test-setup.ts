import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// findBy*/waitFor budget: 1s (the default) is too tight when `turbo --force` runs every package's
// tests at once on one machine; a slow resolve then reads as a missing element.
configure({ asyncUtilTimeout: 4000 });

afterEach(cleanup);
