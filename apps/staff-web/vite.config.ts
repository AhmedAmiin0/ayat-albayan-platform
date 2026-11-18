import { webConfig } from '@ab/config/vite';

// The staff app (app.ayatalbayan.com): the shared web config (docs/51 §2), on the usual dev port.
export default webConfig({ dir: import.meta.dirname, port: 5173, icons: 'staff' });
