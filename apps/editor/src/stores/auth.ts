import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../api/auth';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('baniya-token') || '');
  const user = ref<{ id: string; email: string; name: string } | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password);
    token.value = res.data.token;
    user.value = res.data.user;
    localStorage.setItem('baniya-token', res.data.token);
  }

  async function register(email: string, password: string, name: string) {
    const res = await authApi.register(email, password, name);
    token.value = res.data.token;
    user.value = res.data.user;
    localStorage.setItem('baniya-token', res.data.token);
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('baniya-token');
  }

  return { token, user, isAuthenticated, login, register, logout };
});
