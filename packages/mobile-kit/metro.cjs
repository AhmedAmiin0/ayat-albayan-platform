// The Metro config of every Expo app here. `@/` is resolved here, not by Expo's tsconfig `paths`
// support: Expo 57 expands `${configDir}` against the folder of the tsconfig that declares `paths`
// (the repo root's tsconfig.base.json), not the app's, so `@/x` would point at <repo>/src/x.
const { join } = require('node:path');

const ALIAS = '@/';

/** A resolveRequest that sends `@/x` to `<appDir>/src/x` and every other name on unchanged. */
const appAlias = (appDir, next) => (context, name, platform) => {
  const target = name.startsWith(ALIAS) ? join(appDir, 'src', name.slice(ALIAS.length)) : name;
  return next(context, target, platform);
};

/** `appDir`: the app's folder (its metro.config's __dirname). */
const metroConfig = (appDir) => {
  const { getDefaultConfig } = require('expo/metro-config');
  const config = getDefaultConfig(appDir);
  const next = config.resolver.resolveRequest;
  config.resolver.resolveRequest = appAlias(appDir, (context, name, platform) =>
    (next ?? context.resolveRequest)(context, name, platform),
  );
  return config;
};

module.exports = { appAlias, metroConfig };
