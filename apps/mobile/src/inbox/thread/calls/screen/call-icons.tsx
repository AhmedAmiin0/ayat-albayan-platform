import { I18nManager } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// The call's line icons (24px grid, 1.75 stroke, as chat-icons.tsx). Decorative: every button names
// its action, so each icon is hidden from screen readers.

interface IconProps {
  color: string;
  size?: number;
}

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
const HANDSET = 'M6.6 3.5h2.6l1.4 4-1.9 1.3a12 12 0 0 0 6.5 6.5l1.3-1.9 4 1.4v2.6a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z';

function Line({ d, color, size = 22, rotate = 0 }: IconProps & { d: readonly string[]; rotate?: number }) {
  return (
    <Svg {...hidden} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={rotate ? { transform: [{ rotate: `${rotate}deg` }] } : undefined}>
      {d.map((p) => (
        <Path key={p} d={p} />
      ))}
    </Svg>
  );
}

/** The handset: «اتصال صوتي», «قبول». */
export const PhoneIcon = (p: IconProps) => <Line {...p} d={[HANDSET]} />;
/** The handset laid down: «إنهاء» / «رفض», as WhatsApp draws it. */
export const HangUpIcon = (p: IconProps) => <Line {...p} d={[HANDSET]} rotate={135} />;
export const MicIcon = (p: IconProps) => <Line {...p} d={['M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z', 'M6 11a6 6 0 0 0 12 0M12 17v4']} />;
export const MicOffIcon = (p: IconProps) => <Line {...p} d={['M15 10V6a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 4.6 2.5', 'M6 11a6 6 0 0 0 9.6 4.8M18 11a6 6 0 0 1-.4 2.2M12 17v4M4 4l16 16']} />;
export const SpeakerIcon = (p: IconProps) => <Line {...p} d={['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11']} />;
/** «تصغير»: points down in both directions (never mirrored). */
export const ChevronDownIcon = (p: IconProps) => <Line {...p} d={['m6 9 6 6 6-6']} />;

/**
 * The small arrow beside a call entry, WhatsApp's: out of the handset for ours, into it for theirs.
 * Drawn for LTR and mirrored in RTL, like the line it sits in.
 */
export function CallArrowIcon({ out, ...p }: IconProps & { out: boolean }) {
  const flip = I18nManager.isRTL ? -1 : 1;
  return (
    <Svg {...hidden} viewBox="0 0 24 24" width={p.size ?? 14} height={p.size ?? 14} fill="none" stroke={p.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ transform: [{ scaleX: flip }] }}>
      <Path d={out ? 'M7 17 17 7M9 7h8v8' : 'M17 7 7 17M15 17H7V9'} />
    </Svg>
  );
}
