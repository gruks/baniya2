<template>
  <span :class="['badge', variantClass]">{{ text }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    text: string;
    color?: 'success' | 'warning' | 'error' | 'info' | 'muted';
    variant?: 'solid' | 'outline';
  }>(),
  { color: 'muted', variant: 'solid' }
);

const variantClass = computed(() => {
  const classes = [`badge-${props.color}`];
  if (props.variant === 'outline') classes.push('badge-outline');
  return classes.join(' ');
});
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.badge-success {
  background: rgba(16, 185, 129, 0.12);
  color: var(--color-success);
}

.badge-warning {
  background: rgba(245, 158, 11, 0.12);
  color: var(--color-warning);
}

.badge-error {
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-error);
}

.badge-info {
  background: rgba(59, 130, 246, 0.12);
  color: var(--color-info);
}

.badge-muted {
  background: var(--color-bg-tertiary);
  color: var(--color-text-muted);
}

.badge.outline {
  background: transparent;
  border: 1px solid currentColor;
}
</style>
