import { z } from 'zod';

const uuid = z.string().uuid();
const uuidOrNull = z.string().uuid().nullable().optional();

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
});
