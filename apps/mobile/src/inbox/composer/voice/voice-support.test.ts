import { Platform } from 'react-native';

let mockRuntime: string | null = '0.3.0';
jest.mock('expo-updates', () => ({
  get runtimeVersion() {
    return mockRuntime;
  },
}));
let mockModule: unknown = { AudioRecorder: function AudioRecorder() {} };
jest.mock('expo-audio', () => ({
  get AudioModule() {
    return mockModule;
  },
}));

import { runtimeRecords, voiceSupported } from './voice-support';

const os = (value: string) => Object.defineProperty(Platform, 'OS', { value, configurable: true });

describe('runtimeRecords', () => {
  it('0.3.0 and later record; 0.2.0 (no RECORD_AUDIO) does not; a dev build does', () => {
    expect(['0.3.0', '0.3.1', '0.10.0', '1.0.0'].map(runtimeRecords)).toEqual([true, true, true, true]);
    expect(['0.2.0', '0.1.9', 'x'].map(runtimeRecords)).toEqual([false, false, false]);
    expect(runtimeRecords(null)).toBe(true);
  });
});

describe('voiceSupported', () => {
  afterEach(() => {
    mockRuntime = '0.3.0';
    mockModule = { AudioRecorder: function AudioRecorder() {} };
  });

  it('Android on 0.3.0 with the native recorder: yes', () => {
    os('android');
    expect(voiceSupported()).toBe(true);
  });

  it('an old APK, iOS, or no native recorder: no microphone', () => {
    os('android');
    mockRuntime = '0.2.0';
    expect(voiceSupported()).toBe(false);
    mockRuntime = '0.3.0';
    mockModule = undefined;
    expect(voiceSupported()).toBe(false);
    mockModule = { AudioRecorder: function AudioRecorder() {} };
    os('ios');
    expect(voiceSupported()).toBe(false);
  });
});
