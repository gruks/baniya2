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
              <div class="setting-desc">Toggle between light and dark theme</div>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="darkMode" @change="toggleDark" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-section card">
          <h3>Provider Status</h3>
          <div v-for="(active, name) in providers.status" :key="name" class="setting-row">
            <div>
              <div class="setting-label" style="text-transform: capitalize;">{{ name }}</div>
            </div>
            <span :class="['badge', active ? 'badge-success' : 'badge-muted']">{{ active ? 'Connected' : 'Offline' }}</span>
          </div>
        </div>

        <div class="settings-section card">
          <h3>Account</h3>
          <div class="setting-row">
            <div>
              <div class="setting-label">Logged in as</div>
              <div class="setting-desc">{{ auth.user?.email || 'N/A' }}</div>
            </div>
            <button class="btn btn-sm btn-danger" @click="logout">Logout</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppSidebar from '../components/shared/AppSidebar.vue';
import { useAuthStore } from '../stores/auth';
import { useProvidersStore } from '../stores/providers';

const auth = useAuthStore();
const providers = useProvidersStore();
const router = useRouter();
const darkMode = ref(localStorage.getItem('baniya-dark') === 'true');

onMounted(() => providers.fetchStatus());

function toggleDark() {
  localStorage.setItem('baniya-dark', String(darkMode.value));
  document.documentElement.classList.toggle('dark', darkMode.value);
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.topbar { display: flex; align-items: center; padding: 10px 24px; border-bottom: 1px solid var(--color-border); }
.topbar-title { font-size: 18px; font-weight: 500; }
.settings-section { margin-bottom: 16px; }
.settings-section h3 { font-size: 15px; font-weight: 500; margin-bottom: 16px; }
.setting-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
.setting-row:last-child { border-bottom: none; }
.setting-label { font-size: 14px; font-weight: 500; }
.setting-desc { font-size: 12px; color: var(--color-text-secondary); }
.toggle { position: relative; display: inline-block; width: 40px; height: 22px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: var(--color-border-strong); border-radius: 22px;
  transition: 0.2s;
}
.toggle-slider::before {
  content: ''; position: absolute;
  height: 16px; width: 16px; left: 3px; bottom: 3px;
  background: white; border-radius: 50%; transition: 0.2s;
}
.toggle input:checked + .toggle-slider { background: var(--color-brand); }
.toggle input:checked + .toggle-slider::before { transform: translateX(18px); }
</style>
