// The chat's display pieces (docs: «reuse the components from the whatsapp chat»): props-driven,
// no API and no chat types. The staff inbox wraps them with its own data; the student channel too.
export { BubbleMeta, type BubbleMetaProps } from './bubble/BubbleMeta';
export { BUBBLE_PAD, BubbleShell, type BubbleShellProps } from './bubble/BubbleShell';
export { type BubbleSide, bubbleSide } from './bubble/bubble-side';
export { useSmallText } from './bubble/use-small-text';
export { AttachTile } from './composer/AttachTile';
export { ComposerBar, type ComposerBarProps } from './composer/ComposerBar';
export { RoundAction, type RoundActionProps } from './composer/RoundAction';
export { DayChip } from './days/DayChip';
export { chatDayLabel, chatRowTime } from './days/day-label';
export { EmojiGrid } from './emoji/EmojiGrid';
export { insertAt } from '@ab/client-core';
export { FloatingDay } from './days/FloatingDay';
export {
  CHIP_BOX,
  CHIP_MARGIN,
  chipCovered,
  type Frame,
  type Separator,
  type Viewport,
} from './days/top-band';
export { CloseIcon, MicIcon, PauseIcon, PlayIcon, ReplyIcon, SendIcon } from './icons/chat-glyphs';
export {
  AttachIcon,
  CameraIcon,
  DocumentIcon,
  EmojiIcon,
  GalleryIcon,
} from './icons/composer-icons';
export { type ChatIconProps, hiddenIcon, IconLine } from './icons/icon-line';
export { PhotoViewer } from './photo/PhotoViewer';
export { ViewerClose } from './photo/ViewerClose';
export { QuoteBar, type QuoteBarProps } from './quote/QuoteBar';
export { QuoteCard, type QuoteCardProps } from './quote/QuoteCard';
export { QuoteUnavailable } from './quote/QuoteUnavailable';
export { SwipeReply } from './swipe/SwipeReply';
export { DeliveryTicks, type DeliveryTicksProps } from './ticks/DeliveryTicks';
export { mediaProgress, mediaTime } from './voice/media-time';
export { RecDot } from './voice/RecDot';
export { Spinner } from './voice/Spinner';
export { atEnd, nextRate, type Rate, stepTo, voiceClock } from './voice/voice-math';
export { VoiceRow, type VoiceRowProps } from './voice/VoiceRow';
export { A4, imageRatio } from './pdf/pdf-ratio';
export { PdfBadge } from './pdf/PdfBadge';
export { PdfPage, type PdfPageProps, type PdfZoom } from './pdf/PdfPage';
export { PdfStrip } from './pdf/PdfStrip';
export { PdfViewer, type PdfViewerProps } from './pdf/PdfViewer';
