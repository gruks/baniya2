<template>
  <div class="provider-bar">
    <div v-for="(active, name) in status" :key="name" class="provider-item">
      <span :class="['provider-dot', active ? 'dot-active' : 'dot-inactive']"></span>
      <span class="provider-name">{{ name }}</span>
      <span class="provider-label">{{ label(String(name), Boolean(active)) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ status: Record<string, boolean> }>();

function label(name: string, active: boolean) {
  if (name === 'ollama' || name === 'lmstudio') return active ? 'running' : 'offline';
  return active ? 'configured' : 'missing key';
}
</script>

<style scoped>
.provider-bar { display: flex; gap: 24px; flex-wrap: wrap; }
.provider-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.provider-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-active { background: var(--color-success); }
.dot-inactive { background: var(--color-text-muted); }
.provider-name { font-weight: 500; text-transform: capitalize; }
.provider-label { color: var(--color-text-muted); }
</style>
