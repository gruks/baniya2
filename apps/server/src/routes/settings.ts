import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import { SettingsEntity } from '../entities/Settings';

const router: Router = Router();
const settingsRepo = () => AppDataSource.getRepository(SettingsEntity);

const updateSchema = z.object({
  openaiApiKey: z.string().optional().nullable(),
  anthropicApiKey: z.string().optional().nullable(),
  googleApiKey: z.string().optional().nullable(),
  ollamaUrl: z.string().optional(),
  ollamaEnabled: z.boolean().optional(),
  defaultLocalModel: z.string().optional(),
  defaultCloudModel: z.string().optional(),
  defaultRoute: z.string().optional(),
});

async function getOrCreate(): Promise<SettingsEntity> {
  let settings = await settingsRepo().findOne({ where: {} });
  if (!settings) {
    settings = settingsRepo().create();
    await settingsRepo().save(settings);
  }
  return settings;
}

router.get('/', async (_req, res) => {
  try {
    if (!AppDataSource.isInitialized) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }
    const settings = await getOrCreate();
    res.json({
      openaiApiKey: settings.openaiApiKey ? '***' : null,
      anthropicApiKey: settings.anthropicApiKey ? '***' : null,
      googleApiKey: settings.googleApiKey ? '***' : null,
      ollamaUrl: settings.ollamaUrl,
      ollamaEnabled: settings.ollamaEnabled,
      defaultLocalModel: settings.defaultLocalModel,
      defaultCloudModel: settings.defaultCloudModel,
      defaultRoute: settings.defaultRoute,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    if (!AppDataSource.isInitialized) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
      return;
    }
    const settings = await getOrCreate();
    const updates = parsed.data;
    if (updates.openaiApiKey !== undefined) settings.openaiApiKey = updates.openaiApiKey || null;
    if (updates.anthropicApiKey !== undefined) settings.anthropicApiKey = updates.anthropicApiKey || null;
    if (updates.googleApiKey !== undefined) settings.googleApiKey = updates.googleApiKey || null;
    if (updates.ollamaUrl !== undefined) settings.ollamaUrl = updates.ollamaUrl;
    if (updates.ollamaEnabled !== undefined) settings.ollamaEnabled = updates.ollamaEnabled;
    if (updates.defaultLocalModel !== undefined) settings.defaultLocalModel = updates.defaultLocalModel;
    if (updates.defaultCloudModel !== undefined) settings.defaultCloudModel = updates.defaultCloudModel;
    if (updates.defaultRoute !== undefined) settings.defaultRoute = updates.defaultRoute;
    await settingsRepo().save(settings);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export { router as settingsRouter };
