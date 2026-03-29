import { Router } from 'express';
import { z } from 'zod';
import { classify } from '@baniya/data-classifier';
import { BaniyaRouter, checkOllamaStatus, checkLMStudioStatus, listOllamaModels } from '@baniya/llm-router';
import { AuditLogger } from '@baniya/audit-logger';
import type { RouterConfig, ProviderStatus } from '@baniya/types';
import { AppDataSource } from '../data-source';

const router: Router = Router();
const baniyaRouter = new BaniyaRouter();
let auditLogger: AuditLogger | null = null;

function getAuditLogger(): AuditLogger {
  if (!auditLogger) auditLogger = new AuditLogger(AppDataSource);
  return auditLogger;
}

// GET /api/baniya/cost-summary
router.get('/cost-summary', async (req, res) => {
  try {
    const { workflowId, days = '30' } = req.query as Record<string, string>;
    const summary = await getAuditLogger().getCostSummary(workflowId || undefined, parseInt(days));
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cost summary' });
  }
});

// GET /api/baniya/audit
router.get('/audit', async (req, res) => {
  try {
    const { workflowId, sensitivity, page = '1', limit = '20' } = req.query as Record<string, string>;
    const result = await getAuditLogger().getRows({
      workflowId: workflowId || undefined,
      sensitivity: sensitivity || undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get audit rows' });
  }
});

// GET /api/baniya/providers/status
router.get('/providers/status', async (_req, res) => {
  try {
    const [ollama, lmstudio] = await Promise.all([
      checkOllamaStatus(),
      checkLMStudioStatus(),
    ]);

    const status: ProviderStatus = {
      ollama,
      lmstudio,
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GOOGLE_API_KEY,
    };

    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check provider status' });
  }
});

// POST /api/baniya/classify
router.post('/classify', (req, res) => {
  try {
    const { payload } = req.body;
    const result = classify(payload);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Classification failed' });
  }
});

// POST /api/baniya/route
router.post('/route', async (req, res) => {
  try {
    const { payload, prompt, config } = req.body;
    const result = await baniyaRouter.route(payload, prompt, config as RouterConfig);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Routing failed' });
  }
});

// GET /api/baniya/models/local
router.get('/models/local', async (_req, res) => {
  try {
    const models = await listOllamaModels();
    res.json({ models });
  } catch (err) {
    res.json({ models: [] });
  }
});

export { router as baniyaRouter };
