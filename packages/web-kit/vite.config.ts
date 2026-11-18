import { webConfig } from '@ab/config/vite';

// The kit's own tests (docs/51 §2): the apps' config, without routes or a dev server.
export default webConfig({ dir: import.meta.dirname, port: 5199, routes: false });
