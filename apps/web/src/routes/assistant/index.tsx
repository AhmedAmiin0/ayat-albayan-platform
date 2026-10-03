import { createFileRoute } from '@tanstack/react-router';
import { AssistantHome } from '@/features/classroom/AssistantHome';

export const Route = createFileRoute('/assistant/')({ component: AssistantHome });
