import client from './client';

export const authApi = {
  login: (email: string, password: string) =>
    client.post('/api/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    client.post('/api/auth/register', { email, password, name }),
  me: () => client.get('/api/auth/me'),
};
