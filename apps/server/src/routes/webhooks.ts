import { Router } from 'express';
import type {
  Workflow,
  TriggerPayload,
  WorkflowNode,
  WorkflowEdge,
} from '@baniya/types';
import { AppDataSource } from '../data-source';
import { WorkflowEntity } from '../entities/Workflow';
import { ExecutionEntity } from '../entities/Execution';
import { workflowEngine } from './workflows';
import { webhookTriggerSchema } from '../validation/schemas';

const router: Router = Router();
const workflowRepo = () => AppDataSource.getRepository(WorkflowEntity);
const executionRepo = () => AppDataSource.getRepository(ExecutionEntity);

// POST /webhooks/:workflowId/:nodeId
router.post('/:workflowId/:nodeId', async (req, res) => {
  try {
    // Validate params
    webhookTriggerSchema.parse({
      workflowId: req.params.workflowId,
      nodeId: req.params.nodeId,
    });

    const wf = await workflowRepo().findOneBy({ id: req.params.workflowId });
    if (!wf || !wf.active) {
      res.status(404).json({ error: 'Workflow not found or inactive' });
      return;
    }

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
      source: 'webhook',
      data: { ...req.body, ...req.query, nodeId: req.params.nodeId },
      triggeredAt: new Date().toISOString(),
    };

    const summary = await workflowEngine.execute(workflow, trigger);

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
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'Execution failed' });
  }
});

// GET /webhooks/:workflowId/:nodeId (for GET triggers)
router.get('/:workflowId/:nodeId', async (req, res) => {
  try {
    // Validate params
    webhookTriggerSchema.parse({
      workflowId: req.params.workflowId,
      nodeId: req.params.nodeId,
    });

    const wf = await workflowRepo().findOneBy({ id: req.params.workflowId });
    if (!wf || !wf.active) {
      res.status(404).json({ error: 'Workflow not found or inactive' });
      return;
    }

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
      source: 'webhook',
      data: { ...req.query, nodeId: req.params.nodeId },
      triggeredAt: new Date().toISOString(),
    };

    const summary = await workflowEngine.execute(workflow, trigger);
    res.json(summary);
  } catch (err) {
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'Execution failed' });
  }
});

export { router as webhookRouter };
