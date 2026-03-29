import { Router } from 'express';
import { z } from 'zod';
import type { Workflow, TriggerPayload, WorkflowNode, WorkflowEdge } from '@baniya/types';
import { AppDataSource } from '../data-source';
import { WorkflowEntity } from '../entities/Workflow';
import { ExecutionEntity } from '../entities/Execution';
import { AuthRequest } from '../middleware/auth';
import { WorkflowEngine } from '@baniya/workflow-engine';
import { broadcastToAll } from '../websocket';
import { validate } from '../middleware/validate';

const router: Router = Router();
const workflowRepo = () => AppDataSource.getRepository(WorkflowEntity);
const executionRepo = () => AppDataSource.getRepository(ExecutionEntity);
const engine = new WorkflowEngine();

// Forward engine events to WebSocket
engine.on('execution:started', (data) => broadcastToAll({ type: 'execution:started', ...data }));
engine.on('node:running', (data) => broadcastToAll({ type: 'node:running', ...data }));
engine.on('node:done', (data) => broadcastToAll({ type: 'node:done', ...data }));
engine.on('node:error', (data) => broadcastToAll({ type: 'node:error', ...data }));
engine.on('execution:done', (data) => broadcastToAll({ type: 'execution:done', ...data }));

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  active: z.boolean().optional(),
});

const executeSchema = z.object({
  payload: z.record(z.unknown()).optional(),
});

// GET /api/workflows
router.get('/', async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const workflows = await workflowRepo().find({
      where: { userId: authReq.user?.id },
      order: { updatedAt: 'DESC' },
    });
    res.json(workflows.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      active: w.active,
      nodes: w.definition?.nodes ?? [],
      edges: w.definition?.edges ?? [],
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/workflows
router.post('/', async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const body = createSchema.parse(req.body);
    const workflow = workflowRepo().create({
      name: body.name,
      description: body.description ?? '',
      userId: authReq.user?.id,
      definition: { nodes: [], edges: [] },
    });
    await workflowRepo().save(workflow);
    res.status(201).json({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      active: workflow.active,
      nodes: [],
      edges: [],
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workflows/:id
router.get('/:id', async (req, res) => {
  try {
    const workflow = await workflowRepo().findOneBy({ id: req.params.id });
    if (!workflow) { res.status(404).json({ error: 'Workflow not found' }); return; }
    res.json({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      active: workflow.active,
      nodes: workflow.definition?.nodes ?? [],
      edges: workflow.definition?.edges ?? [],
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/workflows/:id
router.put('/:id', async (req, res) => {
  try {
    const body = updateSchema.parse(req.body);
    console.log(`[Workflow PUT] Saving workflow ${req.params.id}:`, {
      name: body.name,
      nodesCount: body.nodes?.length ?? 0,
      edgesCount: body.edges?.length ?? 0,
    });
    const workflow = await workflowRepo().findOneBy({ id: req.params.id });
    if (!workflow) {
      console.log(`[Workflow PUT] Workflow not found: ${req.params.id}`);
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    workflow.name = body.name;
    workflow.description = body.description ?? workflow.description;
    workflow.definition = { nodes: body.nodes ?? [], edges: body.edges ?? [] };
    if (body.active !== undefined) workflow.active = body.active;
    await workflowRepo().save(workflow);
    console.log(`[Workflow PUT] Saved successfully: ${workflow.id}`);

    res.json({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      active: workflow.active,
      nodes: workflow.definition.nodes,
      edges: workflow.definition.edges,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error(`[Workflow PUT] Error saving workflow ${req.params.id}:`, err);
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Internal server error', details: err instanceof Error ? err.message : String(err) });
  }
});

// PATCH /api/workflows/:id/active
router.patch('/:id/active', async (req, res) => {
  try {
    const workflow = await workflowRepo().findOneBy({ id: req.params.id });
    if (!workflow) { res.status(404).json({ error: 'Workflow not found' }); return; }
    workflow.active = !workflow.active;
    await workflowRepo().save(workflow);
    res.json({ id: workflow.id, active: workflow.active });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await workflowRepo().delete(req.params.id);
    if (result.affected === 0) { res.status(404).json({ error: 'Workflow not found' }); return; }
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/workflows/:id/execute
router.post('/:id/execute', validate(executeSchema), async (req, res) => {
  try {
    const wf = await workflowRepo().findOneBy({ id: req.params.id });
    if (!wf) { res.status(404).json({ error: 'Workflow not found' }); return; }

    const workflow: Workflow = {
      id: wf.id,
      name: wf.name,
      description: wf.description,
      nodes: (wf.definition?.nodes ?? []) as WorkflowNode[],
      edges: (wf.definition?.edges ?? []) as WorkflowEdge[],
      active: wf.active,
      createdAt: wf.createdAt.toISOString(),
      updatedAt: wf.updatedAt.toISOString(),
    };

    const trigger: TriggerPayload = {
      source: 'manual',
      data: req.body.payload ?? {},
      triggeredAt: new Date().toISOString(),
    };

    // Execute asynchronously
    const summary = await engine.execute(workflow, trigger);

    // Save execution record
    const execution = executionRepo().create({
      id: summary.id,
      workflowId: summary.workflowId,
      status: summary.status,
      nodeResults: summary.nodeResults as unknown[],
      totalCostUsd: summary.totalCostUSD,
      totalLatencyMs: summary.totalLatencyMs,
      finishedAt: summary.finishedAt ? new Date(summary.finishedAt) : null,
    });
    await executionRepo().save(execution);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Execution failed' });
  }
});

export { router as workflowRouter, engine as workflowEngine };
