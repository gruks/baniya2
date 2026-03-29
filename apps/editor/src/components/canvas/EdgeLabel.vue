<template>
  <div class="edge-label">{{ label }}</div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<style scoped>
.edge-label {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  font-size: 10px;
  color: var(--color-text-secondary);
  pointer-events: none;
  white-space: nowrap;
}
</style>
