// Every component of a tree with the rule-16 checks it fails (docs/63 §3); an empty `failures`
// list is a component that passes.
import { basename, dirname } from 'node:path';
import { parse } from '../../comment-only/source.mjs';
import { bodyFailures } from './body.mjs';
import { componentsOf } from './find.mjs';
import { hookFailure, indexFailure, placeFailure, testsFailure } from './folder.mjs';
import { fileFailures } from './one-component.mjs';
import { outsideImports } from './resolve.mjs';
import { routeFailures } from './routes.mjs';
import { isRoute, isScanned, workspaceOf } from './scope.mjs';

const report = (path, name, failures) => ({
  key: `${path}::${name}`,
  path,
  name,
  ws: workspaceOf(path),
  failures,
});

const listed = (check, reasons) => reasons.filter((r) => r !== null).map((why) => ({ check, why }));

function componentFailures({ tree, path, sf, c, file }) {
  return [
    ...listed(1, [placeFailure(tree, path, c.name)]),
    ...listed(2, [indexFailure(tree, path)]),
    ...file,
    ...listed(5, bodyFailures(c, sf)),
    ...listed(6, [hookFailure(tree, c, path)]),
    ...listed(8, [testsFailure(tree, path)]),
  ];
}

function fileReports(tree, path) {
  const sf = parse(tree.read(path), path);
  const comps = componentsOf(sf);
  if (isRoute(path)) {
    return routeFailures(path, comps, sf).map(({ c, why }) =>
      report(path, c.name, listed(9, [why])),
    );
  }
  const file = fileFailures(sf, comps);
  return comps.map((c) => report(path, c.name, componentFailures({ tree, path, sf, c, file })));
}

function addOutside(reports, tree) {
  for (const [hook, importers] of outsideImports(tree)) {
    const dir = dirname(hook);
    const name = basename(dir);
    const key = `${dir}/${name}.tsx::${name}`;
    const why = `${basename(hook)} is imported from outside ${name}/: ${importers.join(', ')}`;
    const seen = reports.get(key) ?? report(hook, 'hook', []);
    reports.set(seen.key, { ...seen, failures: [...seen.failures, { check: 7, why }] });
  }
}

/** key (`path::Name`) → report, for every component of `tree`. */
export function componentReports(tree) {
  const all = tree.paths.filter(isScanned).flatMap((path) => fileReports(tree, path));
  const reports = new Map(all.map((r) => [r.key, r]));
  addOutside(reports, tree);
  return reports;
}
