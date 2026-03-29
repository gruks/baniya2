import client from './client';

export const baniyaApi = {
  costSummary: (params?: { workflowId?: string; days?: number }) =>
    client.get('/api/baniya/cost-summary', { params }),
  audit: (params?: { workflowId?: string; sensitivity?: string; page?: number; limit?: number }) =>
    client.get('/api/baniya/audit', { params }),
  providerStatus: () => client.get('/api/baniya/providers/status'),
  classify: (payload: any) => client.post('/api/baniya/classify', { payload }),
  estimateCost: (payload: any, sensitivity: string, workflow?: any, executionsPerDay?: number) =>
    client.post('/api/baniya/estimate-cost', { payload, sensitivity, workflow, executionsPerDay }),
  route: (payload: any, prompt: string, config: any) =>
    client.post('/api/baniya/route', { payload, prompt, config }),
  localModels: () => client.get('/api/baniya/models/local'),
};
