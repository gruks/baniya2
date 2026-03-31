<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="app-content">
      <header class="topbar">
        <h1 class="topbar-title">Settings</h1>
      </header>
      <div class="page-container">
        <div class="settings-section card">
          <h3>Appearance</h3>
          <div class="setting-row">
            <div>
              <div class="setting-label">Dark Mode</div>
              <div class="setting-desc">
                Toggle between light and dark theme
              </div>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="darkMode" @change="toggleDark" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-section card">
          <h3>Local LLM (Ollama)</h3>
          <div class="setting-row">
            <div>
              <div class="setting-label">Enable Ollama</div>
              <div class="setting-desc">
                Connect to a local Ollama server running in the background
              </div>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="form.ollamaEnabled" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div class="setting-label">Ollama URL</div>
            <input
              type="text"
              v-model="form.ollamaUrl"
              placeholder="http://localhost:11434"
              class="input"
            />
          </div>
          <div class="setting-row">
            <div class="setting-label">Default Model</div>
            <select v-model="form.defaultLocalModel" class="input">
              <option v-for="m in localModels" :key="m" :value="m">
                {{ m }}
              </option>
            </select>
          </div>
          <div class="setting-row">
            <span
              :class="[
                'badge',
                ollamaConnected ? 'badge-success' : 'badge-muted',
              ]"
            >
              {{ ollamaConnected ? 'Connected' : 'Offline' }}
            </span>
            <button
              class="btn btn-sm btn-primary"
              @click="refreshModels"
              :disabled="loadingModels"
            >
              {{ loadingModels ? 'Refreshing...' : 'Refresh Models' }}
            </button>
          </div>
        </div>

        <div class="settings-section card">
          <h3>Local LLM (LM Studio)</h3>
          <div class="setting-row">
            <div>
              <div class="setting-label">LM Studio Status</div>
              <div class="setting-desc">
                OpenAI-compatible API server at localhost:1234
              </div>
            </div>
            <span
              :class="[
                'badge',
                lmstudioConnected ? 'badge-success' : 'badge-muted',
              ]"
            >
              {{ lmstudioConnected ? 'Running' : 'Offline' }}
            </span>
          </div>
        </div>

        <div class="settings-section card">
          <h3>Cloud LLM API Keys</h3>
          <div class="setting-row column">
            <div class="setting-label">OpenAI API Key</div>
            <input
              type="password"
              v-model="form.openaiApiKey"
              placeholder="sk-..."
              class="input full"
            />
            <div class="setting-hint">Used for GPT-4o, GPT-4o-mini models</div>
          </div>
          <div class="setting-row column">
            <div class="setting-label">Anthropic API Key</div>
            <input
              type="password"
              v-model="form.anthropicApiKey"
              placeholder="sk-ant-..."
              class="input full"
            />
            <div class="setting-hint">Used for Claude models</div>
          </div>
          <div class="setting-row column">
            <div class="setting-label">Google API Key</div>
            <input
              type="password"
              v-model="form.googleApiKey"
              placeholder="AI..."
              class="input full"
            />
            <div class="setting-hint">Used for Gemini models</div>
          </div>
          <div class="setting-row">
            <div class="provider-status">
              <span>OpenAI</span>
              <span
                :class="[
                  'badge',
                  openaiConfigured ? 'badge-success' : 'badge-muted',
                ]"
              >
                {{ openaiConfigured ? 'Configured' : 'Missing' }}
              </span>
            </div>
            <div class="provider-status">
              <span>Anthropic</span>
              <span
                :class="[
                  'badge',
                  anthropicConfigured ? 'badge-success' : 'badge-muted',
                ]"
              >
                {{ anthropicConfigured ? 'Configured' : 'Missing' }}
              </span>
            </div>
            <div class="provider-status">
              <span>Google</span>
              <span
                :class="[
                  'badge',
                  googleConfigured ? 'badge-success' : 'badge-muted',
                ]"
              >
                {{ googleConfigured ? 'Configured' : 'Missing' }}
              </span>
            </div>
          </div>
        </div>

        <div class="settings-section card">
          <h3>Routing Defaults</h3>
          <div class="setting-row">
            <div class="setting-label">Default Route</div>
            <select v-model="form.defaultRoute" class="input">
              <option value="auto">Auto (Recommended)</option>
              <option value="local">Local Only</option>
              <option value="hybrid">Hybrid</option>
              <option value="cloud">Cloud Only</option>
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-label">Default Cloud Model</div>
            <select v-model="form.defaultCloudModel" class="input">
              <option value="gemini-2.0-flash">
                Gemini 2.0 Flash (Default)
              </option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="claude-haiku-4-5">Claude Haiku</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-sonnet-4-6">Claude Sonnet</option>
            </select>
          </div>
        </div>

        <div class="settings-section card">
          <h3>Account</h3>
          <div class="setting-row">
            <div>
              <div class="setting-label">Logged in as</div>
              <div class="setting-desc">{{ auth.user?.email || 'N/A' }}</div>
            </div>
            <button class="btn btn-sm btn-danger" @click="logout">
              Logout
            </button>
          </div>
        </div>

        <div class="actions">
          <button
            class="btn btn-primary"
            @click="saveSettings"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : 'Save Settings' }}
          </button>
          <span v-if="saveMsg" class="save-msg">{{ saveMsg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppSidebar from '../components/shared/AppSidebar.vue';
import { useAuthStore } from '../stores/auth';
import { useProvidersStore } from '../stores/providers';
import { settingsApi, type Settings } from '../api/settings';
import { baniyaApi } from '../api/baniya';

const auth = useAuthStore();
const providers = useProvidersStore();
const router = useRouter();

const darkMode = ref(localStorage.getItem('baniya-dark-mode') === 'true');
const localModels = ref<string[]>([]);
const loadingModels = ref(false);
const saving = ref(false);
const saveMsg = ref('');

const form = ref({
  openaiApiKey: '',
  anthropicApiKey: '',
  googleApiKey: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaEnabled: true,
  defaultLocalModel: 'qwen3-vl:4b',
  defaultCloudModel: 'gemini-2.0-flash',
  defaultRoute: 'auto',
});

const ollamaConnected = computed(() => providers.status.ollama);
const lmstudioConnected = computed(() => providers.status.lmstudio);
const openaiConfigured = computed(
  () => form.value.openaiApiKey || providers.status.openai
);
const anthropicConfigured = computed(
  () => form.value.anthropicApiKey || providers.status.anthropic
);
const googleConfigured = computed(
  () => form.value.googleApiKey || providers.status.gemini
);
const hasAnyCloudKey = computed(
  () =>
    form.value.openaiApiKey ||
    form.value.anthropicApiKey ||
    form.value.googleApiKey ||
    providers.status.openai ||
    providers.status.anthropic ||
    providers.status.gemini
);

onMounted(async () => {
  providers.fetchStatus();
  await loadSettings();
  await refreshModels();
});

async function loadSettings() {
  try {
    const res = await settingsApi.get();
    const s = res.data;
    form.value.ollamaUrl = s.ollamaUrl || 'http://localhost:11434';
    form.value.ollamaEnabled = s.ollamaEnabled !== false;
    form.value.defaultLocalModel = s.defaultLocalModel || 'qwen3-vl:4b';
    form.value.defaultCloudModel = s.defaultCloudModel || 'gemini-2.0-flash';
    form.value.defaultRoute = s.defaultRoute || 'auto';
  } catch {
    /* use defaults */
  }
}

async function refreshModels() {
  loadingModels.value = true;
  try {
    const res = await baniyaApi.localModels();
    localModels.value = res.data.models || [];
    if (
      localModels.value.length > 0 &&
      !localModels.value.includes(form.value.defaultLocalModel)
    ) {
      form.value.defaultLocalModel = localModels.value[0];
    }
  } catch {
    localModels.value = ['llama3.2', 'llama3', 'mistral', 'codellama'];
  }
  loadingModels.value = false;
}

async function saveSettings() {
  saving.value = true;
  saveMsg.value = '';
  try {
    await settingsApi.update({
      openaiApiKey: form.value.openaiApiKey || null,
      anthropicApiKey: form.value.anthropicApiKey || null,
      googleApiKey: form.value.googleApiKey || null,
      ollamaUrl: form.value.ollamaUrl,
      ollamaEnabled: form.value.ollamaEnabled,
      defaultLocalModel: form.value.defaultLocalModel,
      defaultCloudModel: form.value.defaultCloudModel,
      defaultRoute: form.value.defaultRoute,
    });
    saveMsg.value = 'Settings saved!';
    setTimeout(() => (saveMsg.value = ''), 3000);
    providers.fetchStatus();
  } catch (err) {
    saveMsg.value = 'Failed to save settings';
  }
  saving.value = false;
}

function toggleDark() {
  localStorage.setItem('baniya-dark-mode', String(darkMode.value));
  document.documentElement.classList.toggle('dark', darkMode.value);
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  padding: 10px 24px;
  border-bottom: 1px solid var(--color-border);
}
.topbar-title {
  font-size: 18px;
  font-weight: 500;
}
.settings-section {
  margin-bottom: 16px;
}
.settings-section h3 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 16px;
}
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}
.setting-row:last-child {
  border-bottom: none;
}
.setting-row.column {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
.setting-label {
  font-size: 14px;
  font-weight: 500;
}
.setting-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.setting-hint {
  font-size: 11px;
  color: var(--color-text-muted);
}
.provider-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 4px 0;
}
.input {
  padding: 6px 10px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}
.input.full {
  width: 100%;
}
.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}
.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--color-border-strong);
  border-radius: 22px;
  transition: 0.2s;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: var(--color-bg-primary);
  border-radius: 50%;
  transition: 0.2s;
}
.toggle input:checked + .toggle-slider {
  background: var(--color-brand);
}
.toggle input:checked + .toggle-slider::before {
  transform: translateX(18px);
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.save-msg {
  font-size: 13px;
  color: var(--color-success);
}
</style>
