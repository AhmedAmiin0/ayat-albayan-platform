// What the bundle leaves to node_modules: node built-ins and the api's own dependencies, which the
// image's production install provides. Everything else (the workspace packages and their own
// dependencies) is inlined, since apps/api/node_modules does not link a package's dependencies.
import { builtinModules } from 'node:module';

const bareName = (id) => {
  const parts = id.split('/');
  return id.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

/** @param {Record<string, string>} dependencies the api's package.json dependencies */
export function isExternal(dependencies) {
  const installed = Object.entries(dependencies)
    .filter(([, version]) => !version.startsWith('workspace:'))
    .map(([name]) => name);
  const names = new Set([...builtinModules, ...installed]);
  return (id) => id.startsWith('node:') || names.has(bareName(id));
}
