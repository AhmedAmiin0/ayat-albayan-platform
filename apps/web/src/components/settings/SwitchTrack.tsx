// The drawn switch shared by CheckField (settings pages) and «القيم»: a real checkbox (role, name,
// keyboard) laid invisibly over a track and knob. The input carries `switchInputClass` (`peer`) and
// comes right before <SwitchTrack />, so the track follows its checked, focus and disabled states.

/** The invisible checkbox: it covers its whole wrapper, which is the hit area. */
export const switchInputClass = 'peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed';

/** The track and knob; the knob starts at the inline-start (right in RTL) and slides to the end when ON. */
export function SwitchTrack() {
  return (
    <>
      <span
        aria-hidden="true"
        className="block h-6 w-11 rounded-full border border-rule-input bg-sunk transition-colors duration-150 peer-checked:border-lapis-fill peer-checked:bg-lapis-fill peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lapis peer-disabled:opacity-45"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute start-[3px] top-1/2 size-[18px] -translate-y-1/2 rounded-full bg-ink-3 transition-transform duration-150 peer-checked:bg-primary-foreground rtl:peer-checked:-translate-x-5 ltr:peer-checked:translate-x-5"
      />
    </>
  );
}
