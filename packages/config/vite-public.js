// The files every web app serves at its root from the one brand package, @ab/web-kit (owner
// 2026-11-18: apps never share by copying; docs/51 §1 «Brand»):
//   packages/web-kit/public/**       every app: the web-push worker (/sw.js) and /brand/*.png;
//   packages/web-kit/icons/<app>/**  that app's favicons, touch and manifest icons.
// The dev server answers them as is; the build emits them beside index.html at the same paths, so
// the deployed URLs (index.html links, manifest.json) stay where they were.
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = fileURLToPath(new URL('../web-kit/', import.meta.url));
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

/** URL path → file: the shared tree, then the app's icons (none for the kit's own tests). */
export function kitFiles(icons) {
  const trees = [join(KIT, 'public'), ...(icons ? [join(KIT, 'icons', icons)] : [])];
  return new Map(trees.flatMap(tree));
}

/** The Vite plugin: serve (dev) and emit (build) `kitFiles(icons)`. */
export function kitPublic(icons) {
  const files = kitFiles(icons);
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
