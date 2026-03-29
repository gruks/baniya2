import { Router } from 'express';
import { z } from 'zod';
import { classify, estimateCost } from '@baniya/data-classifier';
import { BaniyaRouter, checkOllamaStatus, checkLMStudioStatus, listOllamaModels } from '@baniya/llm-router';
import { AuditLogger } from '@baniya/audit-logger';
import type { RouterConfig, ProviderStatus } from '@baniya/types';
import { AppDataSource } from '../data-source';
import { SettingsEntity } from '../entities/Settings';
import { validate } from '../middleware/validate';

const classifySchema = z.object({
  payload: z.unknown(),
  workflow: z.any().optional(),
  executionsPerDay: z.number().optional(),
});

const routeSchema = z.object({
  payload: z.unknown(),
  prompt: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

const estimateCostSchema = z.object({
  payload: z.unknown().optional(),
  sensitivity: z.enum(['public', 'internal', 'private', 'critical']),
  workflow: z.any().optional(),
  executionsPerDay: z.number().optional(),
});

const chatSchema = z.object({
  prompt: z.string().min(1),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
});

const costSummaryQuerySchema = z.object({
  workflowId: z.string().optional(),
  days: z.coerce.number().optional(),
});

const auditQuerySchema = z.object({
  workflowId: z.string().optional(),
  sensitivity: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const router: Router = Router();
const baniyaRouter = new BaniyaRouter();
let auditLogger: AuditLogger | null = null;

function getAuditLogger(): AuditLogger {
  if (!auditLogger) auditLogger = new AuditLogger(AppDataSource);
  return auditLogger;
}

async function getSettings(): Promise<SettingsEntity | null> {
  if (!AppDataSource.isInitialized) return null;
  try {
    const repo = AppDataSource.getRepository(SettingsEntity);
    let settings = await repo.findOne({ where: {} });
    if (!settings) {
      settings = repo.create();
      await repo.save(settings);
    }
    return settings;
  } catch {
    return null;
  }
}

// GET /api/baniya/cost-summary
router.get('/cost-summary', validate(costSummaryQuerySchema, 'query'), async (req, res) => {
  try {
    const { workflowId, days = '30' } = req.query as Record<string, string>;
    const summary = await getAuditLogger().getCostSummary(workflowId || undefined, parseInt(days));
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cost summary' });
  }
});

// GET /api/baniya/audit
router.get('/audit', validate(auditQuerySchema, 'query'), async (req, res) => {
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
    const settings = await getSettings();
    const localSettings = settings ? {
      ollamaUrl: settings.ollamaUrl,
      ollamaEnabled: settings.ollamaEnabled,
    } : undefined;

    const [ollama, lmstudio] = await Promise.all([
      checkOllamaStatus(localSettings),
      checkLMStudioStatus(),
    ]);

    const openaiKey = settings?.openaiApiKey || process.env.OPENAI_API_KEY;
    const anthropicKey = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    const googleKey = settings?.googleApiKey || process.env.GOOGLE_API_KEY;

    const status: ProviderStatus = {
      ollama: settings?.ollamaEnabled ? ollama : false,
      lmstudio,
      openai: !!openaiKey,
      anthropic: !!anthropicKey,
      gemini: !!googleKey,
    };

    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check provider status' });
  }
});

// POST /api/baniya/classify
router.post('/classify', validate(classifySchema), (req, res) => {
  try {
    const { payload, workflow, executionsPerDay } = req.body;
    const result = classify(payload, workflow, executionsPerDay);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Classification failed' });
  }
});

// POST /api/baniya/estimate-cost
router.post('/estimate-cost', validate(estimateCostSchema), (req, res) => {
  try {
    const { payload, sensitivity, workflow, executionsPerDay } = req.body;
    if (!sensitivity) return res.status(400).json({ error: 'sensitivity is required' });
    const estimate = estimateCost(payload ?? {}, sensitivity, workflow, executionsPerDay);
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: 'Cost estimation failed' });
  }
});

// POST /api/baniya/route
router.post('/route', validate(routeSchema), async (req, res) => {
  try {
    const { payload, prompt, config } = req.body;
    const settings = await getSettings();
    const routerSettings = settings ? {
      local: {
        ollamaUrl: settings.ollamaUrl,
        ollamaEnabled: settings.ollamaEnabled,
        defaultLocalModel: settings.defaultLocalModel,
      },
      cloud: {
        openaiApiKey: settings.openaiApiKey,
        anthropicApiKey: settings.anthropicApiKey,
        googleApiKey: settings.googleApiKey,
        defaultCloudModel: settings.defaultCloudModel,
      },
    } : undefined;
    const result = await baniyaRouter.route(payload, prompt, config as RouterConfig, routerSettings);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Routing failed' });
  }
});

// GET /api/baniya/models/local
router.get('/models/local', async (_req, res) => {
  try {
    const settings = await getSettings();
    const localSettings = settings ? {
      ollamaUrl: settings.ollamaUrl,
      ollamaEnabled: settings.ollamaEnabled,
    } : undefined;
    const models = await listOllamaModels(localSettings);
    res.json({ models });
  } catch (err) {
    res.json({ models: [] });
  }
});

// POST /api/baniya/chat — used by the File Agent panel
router.post('/chat', validate(chatSchema), async (req, res) => {
  try {
    const { prompt, systemPrompt, model, apiKey } = req.body;
    const settings = await getSettings();

    // Build cloud settings: per-request apiKey overrides stored settings
    const cloudSettings: Record<string, string | null | undefined> = {
      openaiApiKey: settings?.openaiApiKey,
      anthropicApiKey: settings?.anthropicApiKey,
      googleApiKey: settings?.googleApiKey,
      defaultCloudModel: model,
    };
    if (apiKey) {
      if (apiKey.startsWith('sk-ant-')) cloudSettings.anthropicApiKey = apiKey;
      else if (apiKey.startsWith('AIza')) cloudSettings.googleApiKey = apiKey;
      else cloudSettings.openaiApiKey = apiKey;
    }

    const routerConfig: RouterConfig = {
      forceRoute: 'cloud',
      preferredCloudModel: model || 'gpt-4o-mini',
      systemPrompt,
      maxTokens: 4096,
    };

    const result = await baniyaRouter.route({}, prompt, routerConfig, { cloud: cloudSettings as any });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Chat failed' });
  }
});

export { router as baniyaRouter };
