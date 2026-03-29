import client from './client';

export const executionsApi = {
  list: (params?: { workflowId?: string; page?: number; limit?: number }) =>
    client.get('/api/executions', { params }),
  get: (id: string) => client.get(`/api/executions/${id}`),
  delete: (id: string) => client.delete(`/api/executions/${id}`),
};
