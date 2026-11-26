// The Metro config of every Expo app here. `@/` is resolved here, not by Expo's tsconfig `paths`
// support: Expo 57 expands `${configDir}` against the folder of the tsconfig that declares `paths`
// (the repo root's tsconfig.base.json), not the app's, so `@/x` would point at <repo>/src/x.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ALIAS = '@/';

/** A resolveRequest that sends `@/x` to `<appDir>/src/x` and every other name on unchanged. */
export const appAlias = (appDir, next) => (context, name, platform) => {
  const target = name.startsWith(ALIAS) ? join(appDir, 'src', name.slice(ALIAS.length)) : name;
  return next(context, target, platform);
};

/** `appDir`: the app's folder (its metro.config.mjs `import.meta.dirname`). */
export const metroConfig = async (appDir) => {
  // expo is the app's dependency, not this package's.
  const file = createRequire(join(appDir, 'package.json')).resolve('expo/metro-config');
  const { getDefaultConfig } = await import(pathToFileURL(file).href);
  const config = getDefaultConfig(appDir);
  const next = config.resolver.resolveRequest;
  config.resolver.resolveRequest = appAlias(appDir, (context, name, platform) =>
    (next ?? context.resolveRequest)(context, name, platform),
  );
  return config;
};
