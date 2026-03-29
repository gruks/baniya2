import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { AppDataSource } from './data-source';
import { jwtMiddleware } from './middleware/auth';
import { authRouter } from './routes/auth';
import { workflowRouter } from './routes/workflows';
import { executionRouter } from './routes/executions';
import { baniyaRouter } from './routes/baniya';
import { settingsRouter } from './routes/settings';
import { webhookRouter } from './routes/webhooks';
import { setupWebSocket } from './websocket';
import { seedDemoWorkflow } from './seed';

const PORT = parseInt(process.env.PORT || '3000');
const EDITOR_URL = process.env.EDITOR_URL || 'http://localhost:5173';

async function main() {
  // Initialize database
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    console.log('⚠️  Starting without database — some features will not work');
  }

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(cors({ origin: EDITOR_URL, credentials: true }));

  // API routes (JWT protected)
  app.use('/api/auth', authRouter);
  app.use('/api/workflows', jwtMiddleware, workflowRouter);
  app.use('/api/executions', jwtMiddleware, executionRouter);
  app.use('/api/baniya', jwtMiddleware, baniyaRouter);
  app.use('/api/settings', jwtMiddleware, settingsRouter);

  // Webhook routes (no auth)
  app.use('/webhooks', webhookRouter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const server = createServer(app);

  // WebSocket
  setupWebSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 Baniya server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);

    // Seed demo workflow
    if (AppDataSource.isInitialized) {
      seedDemoWorkflow('system').catch(err => {
        console.log('⚠️  Demo seed skipped:', err.message);
      });
    }
  });
}

main().catch(console.error);
