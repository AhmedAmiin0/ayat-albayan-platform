const TIME_ZONES = Intl.supportedValuesOf('timeZone');

/** IANA zones for an <input list="tz-options"> — picked, never free-typed times (rule 6). */
export function TimeZoneOptions() {
  return (
    <datalist id="tz-options">
      {TIME_ZONES.map((tz) => (
        <option key={tz} value={tz} />
      ))}
    </datalist>
  );
}
