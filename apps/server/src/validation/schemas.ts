import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

// Workflow schemas
export const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
  active: z.boolean().optional(),
});

export const executeWorkflowSchema = z.object({
  payload: z.record(z.unknown()).optional(),
});

export const toggleActiveSchema = z.object({
  active: z.boolean(),
});

// Baniya schemas
export const classifySchema = z.object({
  payload: z.unknown(),
  workflow: z.any().optional(),
  executionsPerDay: z.number().optional(),
});

export const routeSchema = z.object({
  payload: z.unknown(),
  prompt: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

export const estimateCostSchema = z.object({
  payload: z.unknown().optional(),
  sensitivity: z.enum(['public', 'internal', 'private', 'critical']),
  workflow: z.any().optional(),
  executionsPerDay: z.number().optional(),
});

export const chatSchema = z.object({
  prompt: z.string().min(1),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export const costSummaryQuerySchema = z.object({
  workflowId: z.string().optional(),
  days: z.coerce.number().optional(),
});

export const auditQuerySchema = z.object({
  workflowId: z.string().optional(),
  sensitivity: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export const executionQuerySchema = z.object({
  workflowId: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

// Webhook schemas
export const webhookTriggerSchema = z.object({
  workflowId: z.string().uuid(),
  nodeId: z.string().min(1),
});

// Filesystem schemas
export const filesystemWriteSchema = z.object({
  root: z.string().optional(),
  path: z.string().min(1),
  content: z.string().optional(),
  createDirs: z.boolean().optional(),
});

export const filesystemPatchSchema = z.object({
  root: z.string().optional(),
  path: z.string().min(1),
  oldStr: z.string().min(1),
  newStr: z.string(),
});

export const filesystemAppendSchema = z.object({
  root: z.string().optional(),
  path: z.string().min(1),
  content: z.string().optional(),
});

export const filesystemRenameSchema = z.object({
  root: z.string().optional(),
  from: z.string().min(1),
  to: z.string().min(1),
});

export const filesystemMkdirSchema = z.object({
  root: z.string().optional(),
  path: z.string().min(1),
});

export const filesystemExecSchema = z.object({
  root: z.string().optional(),
  command: z.string().min(1),
  timeout: z.number().optional(),
});

// Query schemas for filesystem GET routes
export const filesystemQuerySchema = z.object({
  root: z.string().optional(),
  path: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const filesystemDeleteSchema = z.object({
  root: z.string().optional(),
  path: z.string().min(1),
});
