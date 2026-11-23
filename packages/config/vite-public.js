// The files every web app serves at its root (apps never share by copying; docs/51 §1 «Brand»):
//   <kitDir>/public/**        every app: the web-push worker (/sw.js);
//   <brandDir>/**             every app: the brand marks at /brand/*.png (@ab/catalog owns them);
//   <kitDir>/icons/<app>/**   that app's favicons, touch and manifest icons.
// The caller names every folder, so this tooling package reaches into no other package itself.
// The dev server answers them as is; the build emits them beside index.html at the same paths, so
// the deployed URLs (index.html links, manifest.json) stay where they were.
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const TYPES = {
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

/** Every file under `root`, keyed by its URL path ('/brand/mark.png'). */
function tree(root) {
  const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
  return files.map((file) => [`/${relative(root, file).split(sep).join('/')}`, file]);
}

const under = (prefix) => ([path, file]) => [`${prefix}${path}`, file];

/** URL path → file: kit public tree, the marks, then the app's icons (none in kit tests). */
export function kitFiles({ kitDir, brandDir, icons }) {
  const appIcons = icons ? tree(join(kitDir, 'icons', icons)) : [];
  const brand = tree(brandDir).map(under('/brand'));
  return new Map([...tree(join(kitDir, 'public')), ...brand, ...appIcons]);
}

/** The Vite plugin: serve (dev) and emit (build) `kitFiles(options)`. */
export function kitPublic(options) {
  const files = kitFiles(options);
  return {
    name: 'ab:kit-public',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = files.get((req.url ?? '').split('?')[0]);
        if (!file) return next();
        res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      for (const [path, file] of files) {
        this.emitFile({ type: 'asset', fileName: path.slice(1), source: readFileSync(file) });
      }
    },
  };
}
