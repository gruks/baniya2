<template>
  <div :class="['mini-badge', statusClass]">
    <span v-if="status === 'running'" class="mini-spinner"></span>
    <span v-else-if="status === 'success'" class="mini-icon">✓</span>
    <span v-else-if="status === 'error'" class="mini-icon">✕</span>
    <span v-if="costUSD !== undefined" class="mini-cost">
      {{ costUSD === 0 ? 'free' : '$' + costUSD.toFixed(5) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status?: 'idle' | 'running' | 'success' | 'error' | 'skipped';
  costUSD?: number;
}>();

const statusClass = computed(() => ({
  'badge-running': props.status === 'running',
  'badge-ok': props.status === 'success',
  'badge-err': props.status === 'error',
}));
</script>

<style scoped>
.mini-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; padding: 2px 6px; border-radius: 10px;
  background: var(--color-bg-secondary); border: 1px solid var(--color-border);
}
.badge-running { border-color: var(--color-warning); color: var(--color-warning); }
.badge-ok { border-color: var(--color-success); color: var(--color-success); }
.badge-err { border-color: var(--color-error); color: var(--color-error); }
.mini-spinner {
  width: 8px; height: 8px; border: 1.5px solid currentColor;
  border-top-color: transparent; border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.mini-cost { color: var(--color-text-muted); }
</style>
