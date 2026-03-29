<template>
  <span class="spinner" :style="{ width: size + 'px', height: size + 'px' }"></span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 16 });
</script>

<style scoped>
.spinner {
  display: inline-block;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-brand);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
