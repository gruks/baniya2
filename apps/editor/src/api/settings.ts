import client from './client';

export interface Settings {
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  googleApiKey: string | null;
  ollamaUrl: string;
  ollamaEnabled: boolean;
  defaultLocalModel: string;
  defaultCloudModel: string;
  defaultRoute: string;
}

export const settingsApi = {
  get: () => client.get<Settings>('/api/settings'),
  update: (data: Partial<Settings>) => client.put('/api/settings', data),
};
