import client from './client';

export const workflowsApi = {
  list: () => client.get('/api/workflows'),
  get: (id: string) => client.get(`/api/workflows/${id}`),
  create: (data: { name: string; description?: string }) => client.post('/api/workflows', data),
  update: (id: string, data: any) => client.put(`/api/workflows/${id}`, data),
  toggleActive: (id: string) => client.patch(`/api/workflows/${id}/active`),
  delete: (id: string) => client.delete(`/api/workflows/${id}`),
  execute: (id: string, payload?: any) => client.post(`/api/workflows/${id}/execute`, { payload }),
};
