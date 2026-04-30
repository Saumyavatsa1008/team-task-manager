import { z } from 'zod';

const idStr = z.string().min(1).max(128);
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().default('');

export const profileUpdateSchema = z.object({
  displayName: text(80).optional(),
  photoURL: z.string().url().nullable().optional(),
});

export const teamCreateSchema = z.object({
  name: text(80),
  description: optionalText(500),
});

export const teamUpdateSchema = z.object({
  name: text(80).optional(),
  description: z.string().trim().max(500).optional(),
});

export const memberAddSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

export const memberUpdateSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export const projectCreateSchema = z.object({
  name: text(80),
  description: optionalText(1000),
});

export const projectUpdateSchema = z.object({
  name: text(80).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

const dueDateSchema = z
  .union([z.string().datetime({ offset: true }), z.string().date(), z.null()])
  .transform((v) => (v === null || v === undefined ? null : new Date(v)));

export const taskCreateSchema = z.object({
  title: text(140),
  description: optionalText(2000),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: dueDateSchema.optional().default(null),
  assigneeId: idStr.nullable().optional().default(null),
});

export const taskUpdateSchema = z.object({
  title: text(140).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: dueDateSchema.optional(),
  assigneeId: idStr.nullable().optional(),
});

export const taskListQuerySchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  assigneeId: idStr.optional(),
});

export const userSearchQuerySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
