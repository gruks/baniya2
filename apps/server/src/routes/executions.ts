import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { ExecutionEntity } from '../entities/Execution';
import { validate } from '../middleware/validate';
import { executionQuerySchema } from '../validation/schemas';

const router: Router = Router();
const executionRepo = () => AppDataSource.getRepository(ExecutionEntity);

// GET /api/executions
router.get('/', validate(executionQuerySchema, 'query'), async (req, res) => {
  try {
    const {
      workflowId,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;
    const qb = executionRepo()
      .createQueryBuilder('e')
      .orderBy('e.startedAt', 'DESC');

    if (workflowId) qb.where('e.workflowId = :workflowId', { workflowId });

    const total = await qb.getCount();
    const p = parseInt(page);
    const l = parseInt(limit);
    const rows = await qb
      .skip((p - 1) * l)
      .take(l)
      .getMany();

    res.json({
      rows: rows.map(r => ({
        id: r.id,
        workflowId: r.workflowId,
        status: r.status,
        totalCostUSD: r.totalCostUsd,
        totalLatencyMs: r.totalLatencyMs,
        nodeResults: r.nodeResults,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
      })),
      total,
      page: p,
      limit: l,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/executions/:id
router.get('/:id', async (req, res) => {
  try {
    const execution = await executionRepo().findOneBy({ id: req.params.id });
    if (!execution) {
      res.status(404).json({ error: 'Execution not found' });
      return;
    }
    res.json({
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      totalCostUSD: execution.totalCostUsd,
      totalLatencyMs: execution.totalLatencyMs,
      nodeResults: execution.nodeResults,
      startedAt: execution.startedAt.toISOString(),
      finishedAt: execution.finishedAt?.toISOString() ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/executions/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await executionRepo().delete(req.params.id);
    if (result.affected === 0) {
      res.status(404).json({ error: 'Execution not found' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as executionRouter };
