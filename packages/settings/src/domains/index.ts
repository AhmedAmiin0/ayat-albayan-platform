// The domain registry files' helpers. The *_SETTINGS constants stay internal: registry.ts spreads
// them into SETTINGS_REGISTRY, the one public view of every entry.
export { academyWhatsappUrl } from './academy.js';
export { FEEDBACK_MODES, type FeedbackMode } from './feedback.js';
export { COMMS_SOURCES, type CommsSource } from './messaging.js';
export { uploadMaxBytes } from './uploads.js';
export {
  TEACHER_PAGE_SWITCH,
  teacherGateOpen,
  teacherPageOn,
  type TeacherGate,
  type TeacherPage,
} from './teaching/teacher-pages.js';
