// The native fingerprint (app.json runtimeVersion policy fingerprint, lane L06): what decides
// which builds an OTA reaches. @expo/fingerprint hashes the googleServicesFile by its path, and
// that path is EAS's file variable GOOGLE_SERVICES_JSON: somewhere on the build machine, absent or
// elsewhere on the runner that publishes the OTA. Ignoring exactly that file keeps both hashes equal.
const path = require('node:path');
const { z } = require('zod');

/** The Firebase file the build env gives (rule 12: parsed), or none. */
const firebase = z.string().min(1).optional().parse(process.env.GOOGLE_SERVICES_JSON);

/** Relative to this app: the form ignorePaths is matched against. */
const fromApp = (file) => path.relative(__dirname, path.resolve(__dirname, file));

module.exports = { ignorePaths: [firebase].filter((f) => f !== undefined).map(fromApp) };
