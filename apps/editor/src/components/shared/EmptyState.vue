<template>
  <div class="empty-state">
    <div class="empty-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <slot name="icon">
          <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" />
        </slot>
      </svg>
    </div>
    <div class="empty-title">{{ title }}</div>
    <div v-if="description" class="empty-desc">{{ description }}</div>
    <button v-if="action" class="btn btn-primary" @click="$emit('action')">{{ action }}</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string; action?: string }>();
defineEmits<{ (e: 'action'): void }>();
</script>

<style scoped>
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; text-align: center; }
.empty-icon { color: var(--color-text-muted); }
.empty-title { font-size: 16px; font-weight: 500; }
.empty-desc { font-size: 13px; color: var(--color-text-secondary); max-width: 320px; }
</style>
