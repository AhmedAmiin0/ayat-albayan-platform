import { IDLE, isRecording, keptTake, meterLevel, MIN_MS, onRelease, roundMode, type Take, type VoiceEvent, type VoiceState, voiceReducer } from './voice-machine';

const take: Take = { uri: 'file:///rec.m4a', ms: 3000, id: 'req-1' };
const run = (events: VoiceEvent[], from: VoiceState = IDLE) => events.reduce(voiceReducer, from);

describe('voiceReducer', () => {
  it('press, hold, release long enough: idle → arming → holding → sending → idle', () => {
    expect(run([{ type: 'arm' }])).toEqual({ kind: 'arming' });
    expect(run([{ type: 'arm' }, { type: 'recording', locked: false }])).toEqual({ kind: 'holding' });
    const sending = run([{ type: 'arm' }, { type: 'recording', locked: false }, { type: 'send', take }]);
    expect(sending).toEqual({ kind: 'sending', take });
    expect(voiceReducer(sending, { type: 'sent' })).toEqual(IDLE);
  });

  it('a screen reader’s tap records locked; slide up locks a hold', () => {
    expect(run([{ type: 'arm' }, { type: 'recording', locked: true }])).toEqual({ kind: 'locked' });
    expect(run([{ type: 'arm' }, { type: 'recording', locked: false }, { type: 'lock' }])).toEqual({ kind: 'locked' });
  });

  it('cancel (reset) from holding or locked discards; no permission resets arming', () => {
    expect(run([{ type: 'reset' }], { kind: 'holding' })).toEqual(IDLE);
    expect(run([{ type: 'reset' }], { kind: 'locked' })).toEqual(IDLE);
    expect(run([{ type: 'arm' }, { type: 'reset' }])).toEqual(IDLE);
  });

  it('interrupted (touch taken, background, 10 min): kept as stopped, then sent with the same take', () => {
    const stopped = run([{ type: 'keep', take }], { kind: 'holding' });
    expect(stopped).toEqual({ kind: 'stopped', take });
    expect(keptTake(stopped)).toBe(take);
    expect(voiceReducer(stopped, { type: 'send', take })).toEqual({ kind: 'sending', take });
  });

  it('a failed send keeps the take (same id) for a retry or delete', () => {
    const failed = run([{ type: 'fail' }], { kind: 'sending', take });
    expect(failed).toEqual({ kind: 'failed', take });
    expect(keptTake(failed)?.id).toBe('req-1');
    expect(voiceReducer(failed, { type: 'send', take })).toEqual({ kind: 'sending', take });
    expect(voiceReducer(failed, { type: 'reset' })).toEqual(IDLE);
  });

  it('events that do not apply change nothing (no double send, no reset mid-send)', () => {
    const sending: VoiceState = { kind: 'sending', take };
    expect(voiceReducer(sending, { type: 'send', take })).toBe(sending);
    expect(voiceReducer(sending, { type: 'reset' })).toBe(sending);
    expect(voiceReducer(IDLE, { type: 'send', take })).toBe(IDLE);
    expect(voiceReducer(IDLE, { type: 'recording', locked: false })).toBe(IDLE);
    expect(voiceReducer(IDLE, { type: 'lock' })).toBe(IDLE);
    expect(voiceReducer(IDLE, { type: 'keep', take })).toBe(IDLE);
    expect(voiceReducer(IDLE, { type: 'sent' })).toBe(IDLE);
    expect(voiceReducer(IDLE, { type: 'fail' })).toBe(IDLE);
    const holding: VoiceState = { kind: 'holding' };
    expect(voiceReducer(holding, { type: 'arm' })).toBe(holding);
  });

  it('isRecording only while holding or locked', () => {
    expect([IDLE, { kind: 'arming' }, { kind: 'holding' }, { kind: 'locked' }, { kind: 'stopped', take }].map((s) => isRecording(s as VoiceState))).toEqual([
      false, false, true, true, false,
    ]);
    expect(keptTake({ kind: 'locked' })).toBeNull();
  });
});

describe('onRelease', () => {
  it('a hold under MIN_MS is a tap; longer sends; locked or idle ignores the lift', () => {
    expect(onRelease({ kind: 'holding' }, MIN_MS - 1)).toBe('too_short');
    expect(onRelease({ kind: 'holding' }, MIN_MS)).toBe('send');
    expect(onRelease({ kind: 'locked' }, 5000)).toBe('none');
    expect(onRelease(IDLE, 5000)).toBe('none');
  });
});

describe('roundMode', () => {
  const base = { voice: true, text: '', staged: false, state: IDLE };
  it('empty box → mic; text, a staged file, or no voice → send', () => {
    expect(roundMode(base)).toBe('mic');
    expect(roundMode({ ...base, text: '  ' })).toBe('mic');
    expect(roundMode({ ...base, text: 'سلام' })).toBe('send');
    expect(roundMode({ ...base, staged: true })).toBe('send');
    expect(roundMode({ ...base, voice: false })).toBe('send');
  });

  it('mic while pressing or holding; send once locked, kept or failed', () => {
    expect(roundMode({ ...base, state: { kind: 'holding' } })).toBe('mic');
    expect(roundMode({ ...base, state: { kind: 'arming' } })).toBe('mic');
    expect(roundMode({ ...base, state: { kind: 'locked' } })).toBe('send');
    expect(roundMode({ ...base, state: { kind: 'failed', take } })).toBe('send');
  });
});

describe('meterLevel', () => {
  it('maps -60…0 dB to 0…1, clamped; silence or no reading is 0', () => {
    expect(meterLevel(0)).toBe(1);
    expect(meterLevel(-30)).toBe(0.5);
    expect(meterLevel(-160)).toBe(0);
    expect(meterLevel(5)).toBe(1);
    expect(meterLevel(Number.NaN)).toBe(0);
  });
});
