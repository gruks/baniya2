import { defineStore } from 'pinia';
import { ref } from 'vue';
import { baniyaApi } from '../api/baniya';

export const useProvidersStore = defineStore('providers', () => {
  const status = ref({ ollama: false, lmstudio: false, openai: false, anthropic: false, gemini: false });
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  async function fetchStatus() {
    try {
      const res = await baniyaApi.providerStatus();
      status.value = res.data;
    } catch { /* ignore */ }
  }

  function startPolling() {
    fetchStatus();
    pollInterval = setInterval(fetchStatus, 10_000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  return { status, fetchStatus, startPolling, stopPolling };
});
