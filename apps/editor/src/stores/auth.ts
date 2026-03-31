import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../api/auth';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('baniya-token') || '');
  const user = ref<{ id: string; email: string; name: string } | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  /**
   * Fetch user profile from /api/auth/me using current token.
   * Returns true if profile loaded successfully, false if token is invalid/expired.
   */
  async function fetchProfile(): Promise<boolean> {
    if (!token.value) return false;
    try {
      const res = await authApi.me();
      user.value = res.data.user;
      return true;
    } catch {
      // Token invalid or expired — clear state silently
      token.value = '';
      user.value = null;
      localStorage.removeItem('baniya-token');
      return false;
    }
  }

  /**
   * Initialize auth state on app load.
   * If a token exists in localStorage, validate it by fetching the profile.
   * Call this once when the app mounts.
   */
  async function initAuth(): Promise<void> {
    const stored = localStorage.getItem('baniya-token');
    if (stored) {
      token.value = stored;
      await fetchProfile();
    }
  }

  async function login(email: string, password: string): Promise<void> {
    const res = await authApi.login(email, password);
    token.value = res.data.token;
    user.value = res.data.user;
    localStorage.setItem('baniya-token', res.data.token);
  }

  async function register(
    email: string,
    password: string,
    name: string
  ): Promise<void> {
    const res = await authApi.register(email, password, name);
    token.value = res.data.token;
    user.value = res.data.user;
    localStorage.setItem('baniya-token', res.data.token);
  }

  function logout(): void {
    token.value = '';
    user.value = null;
    localStorage.removeItem('baniya-token');
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    fetchProfile,
    initAuth,
  };
});
