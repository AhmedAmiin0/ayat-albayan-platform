/**
 * Lane L06: the runtime (fingerprint) the EAS build embeds must equal the one the runner computes
 * for an OTA. The build has the EAS file variable GOOGLE_SERVICES_JSON at a machine-specific path,
 * the runner none: @expo/fingerprint hashes that file by path, so the config ignores exactly it.
 */
interface FingerprintConfig {
  ignorePaths: string[];
}
const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

const load = (file?: string): FingerprintConfig => {
  delete process.env.GOOGLE_SERVICES_JSON;
  Object.assign(process.env, file === undefined ? {} : { GOOGLE_SERVICES_JSON: file });
  let config: FingerprintConfig = { ignorePaths: [] };
  jest.isolateModules(() => {
    config = jest.requireActual<FingerprintConfig>('./fingerprint.config.cjs');
  });
  return config;
};

describe('fingerprint.config.cjs', () => {
  it('ignores nothing without a Firebase file (the runner, a preview without push)', () => {
    expect(load().ignorePaths).toEqual([]);
  });

  it('ignores the Firebase file EAS put outside the app, relative to the app', () => {
    const file = '/eas/environment-secrets/a1b2c3';
    const [ignored] = load(file).ignorePaths;
    expect(ignored).toMatch(/^(\.\.\/)+eas\/environment-secrets\/a1b2c3$/);
  });

  it('ignores a Firebase file inside the app by its own relative path', () => {
    expect(load('./google-services.json').ignorePaths).toEqual(['google-services.json']);
  });

  it('refuses an empty path (zod) rather than ignoring the app folder', () => {
    expect(() => load('')).toThrow();
  });
});
