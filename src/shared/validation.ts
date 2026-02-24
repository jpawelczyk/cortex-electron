import { z } from 'zod';

const uuid = z.string().uuid();
const uuidOrNull = z.string().uuid().nullable().optional();

// Tasks
const taskStatusSchema = z.enum(['inbox', 'today', 'upcoming', 'anytime', 'someday', 'stale', 'logbook', 'cancelled']);
const prioritySchema = z.enum(['P0', 'P1', 'P2', 'P3']);

export const CreateTaskSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  status: taskStatusSchema.optional(),
  when_date: z.string().optional(),
  deadline: z.string().optional(),
  project_id: z.string().uuid().optional(),
  heading_id: z.string().uuid().optional(),
  context_id: z.string().uuid().optional(),
  priority: prioritySchema.optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  status: taskStatusSchema.optional(),
  when_date: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  project_id: uuidOrNull,
  heading_id: uuidOrNull,
  context_id: uuidOrNull,
  priority: prioritySchema.nullable().optional(),
  sort_order: z.number().optional(),
  assignee_id: uuidOrNull,
});

export const TaskIdSchema = uuid;

// Projects
const projectStatusSchema = z.enum(['planned', 'active', 'on_hold', 'blocked', 'completed', 'archived']);

export const CreateProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: projectStatusSchema.optional(),
  context_id: z.string().uuid().optional(),
});

export const UpdateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: projectStatusSchema.optional(),
  context_id: uuidOrNull,
  sort_order: z.number().optional(),
  owner_type: z.enum(['user', 'stakeholder']).optional(),
  owner_stakeholder_id: uuidOrNull,
});

export const ProjectIdSchema = uuid;

// Contexts
export const CreateContextSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const UpdateContextSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sort_order: z.number().optional(),
});

export const ContextIdSchema = uuid;

// Stakeholders
export const CreateStakeholderSchema = z.object({
  name: z.string().min(1),
  organization: z.string().optional(),
  role: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

export const UpdateStakeholderSchema = z.object({
  name: z.string().min(1).optional(),
  organization: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

export const StakeholderIdSchema = uuid;

export const LinkProjectStakeholderSchema = z.object({
  project_id: z.string().uuid(),
  stakeholder_id: z.string().uuid(),
});

export const LinkNoteStakeholderSchema = z.object({
  note_id: z.string().uuid(),
  stakeholder_id: z.string().uuid(),
});

// Meetings
const meetingStatusSchema = z.enum(['scheduled', 'completed', 'cancelled']);

export const CreateMeetingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  start_time: z.string().min(1),
  end_time: z.string().optional(),
  is_all_day: z.boolean().optional(),
  location: z.string().optional(),
  meeting_url: z.string().optional(),
  context_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
});

export const UpdateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  start_time: z.string().min(1).optional(),
  end_time: z.string().nullable().optional(),
  is_all_day: z.boolean().optional(),
  location: z.string().nullable().optional(),
  meeting_url: z.string().nullable().optional(),
  status: meetingStatusSchema.optional(),
  context_id: uuidOrNull,
  project_id: uuidOrNull,
  notes: z.string().nullable().optional(),
  audio_path: z.string().nullable().optional(),
  recording_duration: z.number().int().nullable().optional(),
  transcript: z.string().nullable().optional(),
  transcript_segments: z.string().nullable().optional(),
  transcription_status: z.enum(['pending', 'processing', 'completed', 'failed']).nullable().optional(),
});

export const MeetingIdSchema = uuid;

export const LinkMeetingAttendeeSchema = z.object({
  meeting_id: z.string().uuid(),
  stakeholder_id: z.string().uuid(),
});

// Checklists
export const CreateChecklistItemSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().min(1),
});

export const UpdateChecklistItemSchema = z.object({
  title: z.string().min(1).optional(),
  is_done: z.boolean().optional(),
  sort_order: z.number().optional(),
});

export const ChecklistItemIdSchema = uuid;

export const CreateNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  context_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  is_pinned: z.boolean().optional(),
});

export const UpdateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().nullable().optional(),
  context_id: uuidOrNull,
  project_id: uuidOrNull,
  is_pinned: z.boolean().optional(),
});

export const NoteIdSchema = uuid;

// AI Agents
export const CreateAIAgentSchema = z.object({
  name: z.string().min(1),
  permissions: z.object({
    read: z.boolean(),
    write: z.boolean(),
  }).optional(),
});

export const AIAgentIdSchema = z.string().uuid();

// Auth
export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

export const UpdateUserMetadataSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});
